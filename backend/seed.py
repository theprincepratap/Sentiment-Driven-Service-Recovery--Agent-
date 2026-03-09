"""
Seed script — populates MongoDB with demo data for development/demo purposes.
Run: python seed.py
"""
import asyncio
from datetime import datetime, timedelta
import random
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "sentiment_recovery_agent")

DEPARTMENTS = [
    "Emergency", "Cardiology", "Orthopedics", "Pediatrics",
    "Neurology", "Oncology", "General Medicine", "ICU"
]

MANAGERS = [
    {"manager_id": "MGR-001", "name": "Dr. Sarah Mitchell", "department": "Emergency", "email": "s.mitchell@hospital.com", "role": "Duty Manager"},
    {"manager_id": "MGR-002", "name": "Dr. James  Carter", "department": "Cardiology", "email": "j.carter@hospital.com", "role": "Duty Manager"},
    {"manager_id": "MGR-003", "name": "Dr. Lisa Nguyen", "department": "Orthopedics", "email": "l.nguyen@hospital.com", "role": "Duty Manager"},
    {"manager_id": "MGR-004", "name": "Dr. Ahmed Hassan", "department": "Pediatrics", "email": "a.hassan@hospital.com", "role": "Duty Manager"},
    {"manager_id": "MGR-005", "name": "Dr. Emily Clarke", "department": "Neurology", "email": "e.clarke@hospital.com", "role": "Duty Manager"},
    {"manager_id": "MGR-006", "name": "Dr. Robert Patel", "department": "General Medicine", "email": "r.patel@hospital.com", "role": "Duty Manager"},
    {"manager_id": "MGR-007", "name": "Dr. Jennifer Wong", "department": "Oncology", "email": "j.wong@hospital.com", "role": "Duty Manager"},
    {"manager_id": "MGR-008", "name": "Dr. Michael Torres", "department": "ICU", "email": "m.torres@hospital.com", "role": "Duty Manager"},
]

DEPARTMENTS_DOCS = [
    {"name": "Emergency", "head_name": "Dr. Sarah Mitchell", "head_email": "s.mitchell@hospital.com", "complaint_count": 0},
    {"name": "Cardiology", "head_name": "Dr. James Carter", "head_email": "j.carter@hospital.com", "complaint_count": 0},
    {"name": "Orthopedics", "head_name": "Dr. Lisa Nguyen", "head_email": "l.nguyen@hospital.com", "complaint_count": 0},
    {"name": "Pediatrics", "head_name": "Dr. Ahmed Hassan", "head_email": "a.hassan@hospital.com", "complaint_count": 0},
    {"name": "Neurology", "head_name": "Dr. Emily Clarke", "head_email": "e.clarke@hospital.com", "complaint_count": 0},
    {"name": "Oncology", "head_name": "Dr. Jennifer Wong", "head_email": "j.wong@hospital.com", "complaint_count": 0},
    {"name": "General Medicine", "head_name": "Dr. Robert Patel", "head_email": "r.patel@hospital.com", "complaint_count": 0},
    {"name": "ICU", "head_name": "Dr. Michael Torres", "head_email": "m.torres@hospital.com", "complaint_count": 0},
]

SAMPLE_FEEDBACK = [
    ("Negative", "Angry", "staff_behavior", 4, "The nurse was extremely rude and dismissive when I asked about my medication."),
    ("Negative", "Frustrated", "wait_time", 3, "We waited over 3 hours in the emergency room with no updates."),
    ("Positive", "Grateful", "treatment_quality", 1, "The doctor was incredibly thorough and explained everything clearly."),
    ("Negative", "Anxious", "communication", 4, "Nobody told us what was happening with my father's surgery for 5 hours."),
    ("Positive", "Happy", "staff_behavior", 1, "All the nurses were kind, professional and supportive throughout my stay."),
    ("Negative", "Disappointed", "cleanliness", 3, "The bathroom in my room was not cleaned for two days."),
    ("Positive", "Satisfied", "treatment_quality", 1, "Excellent care from the entire team. I felt safe and well looked after."),
    ("Negative", "Angry", "billing", 4, "I received a bill with charges for services I never received."),
    ("Neutral", "Neutral", "facilities", 2, "The facilities were average. Nothing exceptional but nothing terrible either."),
    ("Negative", "Frustrated", "discharge_process", 3, "Discharge took 4 hours even after the doctor cleared me to leave."),
    ("Positive", "Grateful", "staff_behavior", 1, "Dr. Chen was amazing and took extra time to answer all my questions."),
    ("Negative", "Angry", "wait_time", 5, "I had to wait 6 hours with severe chest pain before seeing a doctor."),
    ("Positive", "Happy", "food", 1, "The meals were surprisingly good and served on time every day."),
    ("Negative", "Disappointed", "communication", 3, "Test results took days and we never received a clear explanation."),
    ("Positive", "Satisfied", "cleanliness", 1, "The room was spotless and staff maintained hygiene protocols throughout."),
]

PATIENT_NAMES = [
    "John Smith", "Maria Garcia", "David Johnson", "Sarah Williams", "Michael Brown",
    "Jennifer Davis", "Robert Wilson", "Linda Moore", "William Taylor", "Barbara Anderson",
    "Richard Thomas", "Susan Jackson", "Joseph White", "Jessica Harris", "Charles Martin"
]


async def seed():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]

    print("🌱 Starting database seed...")

    # Clear existing data
    for col in ["patients", "feedback", "tickets", "managers", "departments", "notifications"]:
        await db[col].drop()
    print("🗑️  Cleared existing collections")

    # Seed managers
    await db.managers.insert_many(MANAGERS)
    print(f"✅ Inserted {len(MANAGERS)} managers")

    # Seed departments
    await db.departments.insert_many(DEPARTMENTS_DOCS)
    print(f"✅ Inserted {len(DEPARTMENTS_DOCS)} departments")

    # Seed patients + feedback + tickets
    tickets_to_insert = []
    notifications_to_insert = []

    for i, (sentiment, emotion, category, severity, feedback_text) in enumerate(SAMPLE_FEEDBACK):
        patient_id = f"PAT-{1000 + i}"
        patient_name = PATIENT_NAMES[i % len(PATIENT_NAMES)]
        department = DEPARTMENTS[i % len(DEPARTMENTS)]
        days_ago = random.randint(0, 7)
        created_at = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))

        # Patient
        await db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": {
                "patient_id": patient_id,
                "name": patient_name,
                "department": department,
                "discharge_date": created_at,
                "survey_sent": True
            }},
            upsert=True
        )

        # Feedback with analysis
        resolution_messages = {
            "staff_behavior": "We sincerely apologize for the behavior you experienced. This does not reflect our standards and we will address this with the team immediately.",
            "wait_time": "We are truly sorry for the excessive wait time you experienced. We are reviewing our processes to ensure this does not happen again.",
            "treatment_quality": "Thank you so much for your kind words! It motivates our team to keep providing excellent care.",
            "communication": "We apologize for the lack of communication during your stay. Keeping families informed is a priority we take very seriously.",
            "cleanliness": "We apologize for the hygiene concerns. We have notified our housekeeping team and will address this immediately.",
            "billing": "We are sorry for the billing error. Our finance team will review your account and correct any mistakes promptly.",
            "discharge_process": "We apologize for the lengthy discharge process. We are working to streamline this for future patients.",
            "food": "Thank you for the positive feedback about our meals! We'll pass your kind words to the catering team.",
            "facilities": "Thank you for your honest assessment. We continually work to improve our facilities.",
            "other": "Thank you for your feedback. We value your experience and will use it to improve our services.",
        }

        feedback_doc = {
            "patient_id": patient_id,
            "department": department,
            "text": feedback_text,
            "name": patient_name,
            "analysis": {
                "sentiment": sentiment,
                "emotion": emotion,
                "category": category,
                "severity": severity,
                "resolution_message": resolution_messages.get(category, resolution_messages["other"])
            },
            "created_at": created_at
        }
        await db.feedback.insert_one(feedback_doc)

        # Ticket for negative
        if sentiment == "Negative":
            import uuid
            ticket_id = f"TKT-{str(uuid.uuid4())[:8].upper()}"
            mgr = next((m for m in MANAGERS if m["department"] == department), MANAGERS[0])
            ticket_doc = {
                "ticket_id": ticket_id,
                "patient_id": patient_id,
                "patient_name": patient_name,
                "department": department,
                "category": category,
                "severity": severity,
                "sentiment": sentiment,
                "emotion": emotion,
                "original_feedback": feedback_text,
                "resolution_message": resolution_messages.get(category, ""),
                "status": random.choice(["open", "open", "in_progress", "resolved"]),
                "assigned_manager": mgr["name"],
                "created_at": created_at,
                "resolved_at": created_at + timedelta(hours=random.randint(1, 48)) if random.random() > 0.6 else None,
                "escalated": False
            }
            tickets_to_insert.append(ticket_doc)

            if severity >= 4:
                notifications_to_insert.append({
                    "alert_type": "critical_complaint",
                    "department": department,
                    "patient_id": patient_id,
                    "severity": severity,
                    "ticket_id": ticket_id,
                    "manager_name": mgr["name"],
                    "message": f"🚨 Critical {emotion} complaint in {department}: {category} (severity {severity}/5)",
                    "created_at": created_at,
                    "read": random.random() > 0.5
                })

    if tickets_to_insert:
        await db.tickets.insert_many(tickets_to_insert)
        print(f"✅ Inserted {len(tickets_to_insert)} tickets")

    if notifications_to_insert:
        await db.notifications.insert_many(notifications_to_insert)
        print(f"✅ Inserted {len(notifications_to_insert)} manager notifications")

    print(f"✅ Inserted {len(SAMPLE_FEEDBACK)} feedback records")
    print("\n🎉 Seed complete! Database is ready for demo.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
