import sqlite3

DB_NAME = "vibhanu_crm.db"


def get_connection():
    conn = sqlite3.connect(DB_NAME, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                contact TEXT,
                address TEXT,
                appointment_date TEXT,
                appointment_time TEXT,
                remarks TEXT,
                audio_path TEXT,
                status TEXT DEFAULT 'Created',
                created_by TEXT DEFAULT 'Marketing',
                claimed_by TEXT
            )
        """)

        # Add this column to an older database without deleting existing leads.
        cursor.execute("PRAGMA table_info(leads)")
        columns = [row["name"] for row in cursor.fetchall()]

        if "claimed_by" not in columns:
            cursor.execute(
                "ALTER TABLE leads ADD COLUMN claimed_by TEXT"
            )

        conn.commit()
    finally:
        conn.close()


def create_lead(customer_name, contact, created_by="Marketing"):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO leads (
                customer_name, contact, status, created_by
            )
            VALUES (?, ?, 'Created', ?)
        """, (customer_name, contact, created_by))

        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def get_all_leads():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM leads ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_lead(lead_id):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM leads WHERE id = ?",
            (lead_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_communication_lead(
    lead_id,
    customer_name,
    address,
    appointment_date,
    appointment_time,
    remarks
):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE leads
            SET customer_name = ?,
                address = ?,
                appointment_date = ?,
                appointment_time = ?,
                remarks = ?
            WHERE id = ?
        """, (
            customer_name,
            address,
            appointment_date,
            appointment_time,
            remarks,
            lead_id
        ))

        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()


def update_vigilance_lead(
    lead_id,
    customer_name,
    address,
    appointment_date,
    appointment_time,
    remarks,
    audio_path
):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE leads
            SET customer_name = ?,
                address = ?,
                appointment_date = ?,
                appointment_time = ?,
                remarks = ?,
                audio_path = ?,
                status = 'Pending Verification',
                claimed_by = NULL
            WHERE id = ?
        """, (
            customer_name,
            address,
            appointment_date,
            appointment_time,
            remarks,
            audio_path,
            lead_id
        ))

        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()


def allocate_lead(lead_id, verified):
    conn = get_connection()
    try:
        cursor = conn.cursor()

        if verified:
            cursor.execute("""
                UPDATE leads
                SET status = 'Allocated to Sales',
                    claimed_by = NULL
                WHERE id = ?
                  AND audio_path IS NOT NULL
                  AND audio_path != ''
            """, (lead_id,))
        else:
            cursor.execute("""
                UPDATE leads
                SET status = 'Verification Failed',
                    claimed_by = NULL
                WHERE id = ?
            """, (lead_id,))

        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()


def claim_lead(lead_id, sales_user):
    """
    Atomically assign an approved lead to one Sales user.
    Only one request can successfully claim an unclaimed lead.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE leads
            SET claimed_by = ?,
                status = 'Claimed by Sales'
            WHERE id = ?
              AND status = 'Allocated to Sales'
              AND (claimed_by IS NULL OR claimed_by = '')
              AND audio_path IS NOT NULL
              AND audio_path != ''
        """, (sales_user, lead_id))

        claimed = cursor.rowcount == 1
        conn.commit()
        return claimed
    finally:
        conn.close()