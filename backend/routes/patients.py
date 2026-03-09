from fastapi import APIRouter
from datetime import datetime
from db.mongodb import get_db
from models.schemas import PatientDischarge
from services.ws_manager import manager as ws_manager
import uuid

router = APIRouter()


@router.post("/patients/discharge")
async def discharge_patient(data: PatientDischarge):
    db = get_db()
    discharge_time = datetime.utcnow()

    patient_doc = {
        "patient_id": data.patient_id,
        "name": data.name,
        "department": data.department,
        "phone": data.phone,
        "email": data.email,
        "discharge_date": discharge_time,
        "survey_sent": True,
        "created_at": discharge_time
    }

    await db.patients.update_one(
        {"patient_id": data.patient_id},
        {"$set": patient_doc},
        upsert=True
    )

    # Broadcast discharge event for live activity feed
    await ws_manager.broadcast("patient_discharged", {
        "patient_id": data.patient_id,
        "name": data.name,
        "department": data.department,
        "message": f"Patient {data.name} discharged from {data.department}. Survey sent.",
        "timestamp": discharge_time.isoformat()
    })

    return {
        "status": "discharged",
        "patient_id": data.patient_id,
        "survey_sent": True,
        "discharge_time": discharge_time.isoformat()
    }


@router.get("/patients")
async def get_patients(limit: int = 50):
    db = get_db()
    cursor = db.patients.find({}).sort("discharge_date", -1).limit(limit)
    patients = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("discharge_date"), datetime):
            doc["discharge_date"] = doc["discharge_date"].isoformat()
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        patients.append(doc)
    return patients
