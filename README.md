# VibhAnuCRM — Departmental Lead Management System

A web-based Customer Relationship Management (CRM) application designed to manage customer leads through a structured, multi-department workflow.

VibhAnuCRM streamlines lead creation, appointment coordination, audio documentation, verification, and sales claiming through a centralized dashboard.

## Key Features

- **Role-Based Dashboards:** Separate interfaces for Marketing, Communication, Vigilance, Support, and Sales.
- **Lead Creation:** Marketing can register new customer leads.
- **Appointment Coordination:** Communication can add customer addresses, appointment dates, times, and remarks.
- **Audio Documentation:** Vigilance can upload audio recordings associated with customer leads.
- **Lead Verification:** Support can review submitted leads and verify or reject them.
- **Sales Claiming:** Sales can claim leads that have been approved.
- **Lead Tracking:** View and refresh lead records through the dashboard.
- **Database Integration:** SQLite stores application records persistently.
- **Web Interface:** HTML, CSS, and JavaScript provide the user interface, with FastAPI powering the backend.

## Departmental Workflow

1. **Marketing** → Creates a customer lead.
2. **Communication** → Adds address and appointment details.
3. **Vigilance** → Uploads the associated audio recording.
4. **Support** → Reviews the recording and verifies or rejects the lead.
5. **Sales** → Claims an approved lead.

## Technology Stack

| Component | Technology |
|---|---|
| Backend API | Python, FastAPI |
| Frontend | HTML, CSS, JavaScript |
| Database | SQLite |
| Configuration | Python dotenv |
| API Testing | FastAPI Swagger UI |

## Project Structure

```text
VibhAnuCRM/
├── main.py
├── database.py
├── index.html
├── style.css
├── script.js
├── requirements.txt
├── .gitignore
├── .env                 # Local configuration; not committed
├── uploads/             # Local audio uploads; not committed
└── vibhanu_crm.db       # Local database; not committed
```

## Getting Started

### Prerequisites

- Python 3.10 or a compatible version for your installed dependencies
- Git
- A web browser
- VS Code (recommended)

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd VibhAnuCRM
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your repository's actual HTTPS URL.

### 2. Create a virtual environment

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root and configure the department passwords required by your application.

Example variable names:

```dotenv
MARKETING_PASSWORD=replace_with_your_password
COMMUNICATION_PASSWORD=replace_with_your_password
VIGILANCE_PASSWORD=replace_with_your_password
SUPPORT_PASSWORD=replace_with_your_password
SALES_PASSWORD=replace_with_your_password
```

Use your own credentials and ensure the backend loads them through `python-dotenv`. Never commit `.env` or real credentials to GitHub.

### 5. Start the backend

```powershell
python -m uvicorn main:app --reload
```

Backend address: `http://127.0.0.1:8000`

Interactive API documentation: `http://127.0.0.1:8000/docs`

### 6. Open the frontend

Open `index.html` using the VS Code Live Server extension, if configured.

The frontend and backend must both be running for the application to work correctly.

## Security Notes

- Keep `.env` excluded from version control.
- Do not commit real passwords, customer information, audio recordings, or database files.
- Use proper server-side authentication and role-based authorization before deploying the application for real users.
- Configure CORS, file-upload validation, and production server settings before deployment.

## Future Improvements

- Stronger authentication and server-side role-based access control.
- Password hashing and secure session management.
- Search, filtering, and pagination for leads.
- Audit logs for verification and lead-claiming activities.
- Automated tests for API endpoints and workflow transitions.
- Production deployment with secure file storage.

## Project Purpose

VibhAnuCRM demonstrates a practical full-stack application for managing lead handoffs across multiple departments, combining a Python API, persistent database storage, and an interactive web interface.

---

**Built with Python, FastAPI, SQLite, HTML, CSS, and JavaScript.**