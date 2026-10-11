import os
from dotenv import load_dotenv

load_dotenv()
import shutil

from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import (
    init_db,
    get_all_leads,
    get_lead,
    create_lead,
    update_communication_lead,
    update_vigilance_lead,
    allocate_lead,
    claim_lead as claim_lead_in_db,
)

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

app = FastAPI(
    title="Vibh-Anu CRM",
    description="Department-based Customer Relationship Management API",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

init_db()


# --------------------------------------------------
# ROLE-BASED LOGIN CREDENTIALS
# --------------------------------------------------


USERS = {
    "marketing@vibhanu.com": {
        "password": os.getenv("MARKETING_PASSWORD"),
        "role": "Marketing",
    },
    "communication@vibhanu.com": {
        "password": os.getenv("COMMUNICATION_PASSWORD"),
        "role": "Communication",
    },
    "vigilance@vibhanu.com": {
        "password": os.getenv("VIGILANCE_PASSWORD"),
        "role": "Vigilance",
    },
    "support@vibhanu.com": {
        "password": os.getenv("SUPPORT_PASSWORD"),
        "role": "Support",
    },
    "sales@vibhanu.com": {
        "password": os.getenv("SALES_PASSWORD"),
        "role": "Sales",
    },
}




# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class LeadCreateRequest(BaseModel):
    customer_name: str
    contact: str


class CommunicationUpdateRequest(BaseModel):
    customer_name: str
    address: str
    appointment_date: str
    appointment_time: str
    remarks: str


class SupportVerificationRequest(BaseModel):
    verified: bool


class SalesClaimRequest(BaseModel):
    username: str


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def find_lead(lead_id: int):
    return get_lead(lead_id)


def require_lead(lead_id: int):
    lead = find_lead(lead_id)
    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )
    return lead


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/")
def home():
    return {"message": "Vibh-Anu CRM backend is running"}


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.post("/login")
def login(data: LoginRequest):
    username = data.username.strip().lower()
    user = USERS.get(username)

    if user is None or user["password"] != data.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    return {
        "message": "Login successful",
        "username": username,
        "role": user["role"],
    }


# --------------------------------------------------
# GET ALL LEADS
# --------------------------------------------------

@app.get("/leads")
def list_leads():
    return get_all_leads()


# --------------------------------------------------
# MARKETING: CREATE LEAD
# --------------------------------------------------

@app.post("/leads")
def add_lead(data: LeadCreateRequest):
    customer_name = data.customer_name.strip()
    contact = data.contact.strip()

    if not customer_name or not contact:
        raise HTTPException(
            status_code=400,
            detail="Customer name and contact are required",
        )

    lead_id = create_lead(customer_name, contact)

    return {
        "message": "Lead created successfully",
        "lead_id": lead_id,
    }


# --------------------------------------------------
# COMMUNICATION: UPDATE CUSTOMER DETAILS
# --------------------------------------------------

@app.put("/leads/{lead_id}/communication")
def communication_update(
    lead_id: int,
    data: CommunicationUpdateRequest,
):
    require_lead(lead_id)

    updated = update_communication_lead(
        lead_id,
        data.customer_name.strip(),
        data.address.strip(),
        data.appointment_date.strip(),
        data.appointment_time.strip(),
        data.remarks.strip(),
    )

    if not updated:
        raise HTTPException(
            status_code=400,
            detail="Lead details could not be updated",
        )

    return {
        "message": "Communication details updated successfully",
        "lead_id": lead_id,
    }


# --------------------------------------------------
# VIGILANCE: SAVE DETAILS AND AUDIO
# --------------------------------------------------

@app.post("/leads/{lead_id}/vigilance")
def vigilance_update(
    lead_id: int,
    customer_name: str = Form(...),
    address: str = Form(...),
    appointment_date: str = Form(...),
    appointment_time: str = Form(...),
    remarks: str = Form(""),
    audio: UploadFile = File(...),
):
    require_lead(lead_id)

    if not audio.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select an audio file",
        )

    allowed_extensions = {
        ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm", ".mpeg"
    }

    extension = os.path.splitext(audio.filename)[1].lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format. Upload MP3, WAV, M4A, AAC, OGG, or WEBM.",
        )

    if audio.content_type and not (
        audio.content_type.startswith("audio/")
        or audio.content_type == "application/octet-stream"
        or audio.content_type == "video/mpeg"
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid file content type.",
        )

    filename = os.path.basename(audio.filename)
    saved_path = os.path.join(
        UPLOAD_DIR,
        f"{lead_id}_{filename}"
    )

    try:
        with open(saved_path, "wb") as output_file:
            shutil.copyfileobj(audio.file, output_file)

        updated = update_vigilance_lead(
            lead_id,
            customer_name.strip(),
            address.strip(),
            appointment_date.strip(),
            appointment_time.strip(),
            remarks.strip(),
            saved_path,
        )

        if not updated:
            if os.path.isfile(saved_path):
                os.remove(saved_path)

            raise HTTPException(
                status_code=400,
                detail="Vigilance details could not be saved",
            )

    finally:
        audio.file.close()

    return {
        "message": "Vigilance details and audio saved successfully",
        "lead_id": lead_id,
        "audio_path": saved_path,
    }


# --------------------------------------------------
# SUPPORT: VERIFY OR REJECT
# --------------------------------------------------

@app.put("/leads/{lead_id}/support")
def support_verify(
    lead_id: int,
    data: SupportVerificationRequest,
):
    lead = require_lead(lead_id)
    audio_path = lead.get("audio_path")

    if not audio_path or not os.path.isfile(audio_path):
        raise HTTPException(
            status_code=400,
            detail="Cannot verify: Vigilance audio is missing",
        )

    updated = allocate_lead(lead_id, data.verified)

    if not updated:
        raise HTTPException(
            status_code=400,
            detail="Lead verification could not be updated",
        )

    if data.verified:
        status = "Allocated to Sales"
        message = "Lead verified and allocated to Sales"
    else:
        status = "Verification Failed"
        message = "Lead verification failed"

    return {
        "message": message,
        "lead_id": lead_id,
        "verified": data.verified,
        "status": status,
    }


# --------------------------------------------------
# GET / PLAY LEAD AUDIO
# --------------------------------------------------

@app.get("/leads/{lead_id}/audio")
def get_lead_audio(lead_id: int):
    lead = require_lead(lead_id)
    audio_path = lead.get("audio_path")

    if not audio_path or not os.path.isfile(audio_path):
        raise HTTPException(
            status_code=404,
            detail="Audio file not found",
        )

    return FileResponse(audio_path)


# --------------------------------------------------
# SALES: CLAIM A LEAD
# --------------------------------------------------

@app.post("/leads/{lead_id}/claim")
def claim_sales_lead(
    lead_id: int,
    data: SalesClaimRequest,
):
    username = data.username.strip().lower()
    user = USERS.get(username)

    if user is None or user["role"] != "Sales":
        raise HTTPException(
            status_code=403,
            detail="Only a Sales user can claim a lead",
        )

    lead = require_lead(lead_id)

    if lead.get("status") == "Claimed by Sales":
        raise HTTPException(
            status_code=409,
            detail=f"This lead has already been claimed by {lead.get('claimed_by') or 'another Sales user'}.",
        )

    if lead.get("status") != "Allocated to Sales":
        raise HTTPException(
            status_code=400,
            detail="This lead is not available to claim",
        )

    audio_path = lead.get("audio_path")
    if not audio_path or not os.path.isfile(audio_path):
        raise HTTPException(
            status_code=400,
            detail="Lead audio is unavailable",
        )

    # The database performs a conditional UPDATE to prevent duplicate claims.
    claimed = claim_lead_in_db(lead_id, username)

    if not claimed:
        latest_lead = require_lead(lead_id)
        if latest_lead.get("claimed_by"):
            raise HTTPException(
                status_code=409,
                detail=f"This lead has already been claimed by {latest_lead['claimed_by']}.",
            )

        raise HTTPException(
            status_code=409,
            detail="This lead is no longer available to claim. Refresh and try again.",
        )

    return {
        "message": "Lead claimed successfully",
        "lead_id": lead_id,
        "claimed_by": username,
        "status": "Claimed by Sales",
    }