# routes/patients.py
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from db.database import get_db
from services.survey_service import send_survey

router = APIRouter(prefix="/api/patients", tags=["Patients"])

class BillingUpdateRequest(BaseModel):
    billingStatus: str   # Paid | Discharged

# STEP 1 — when billing status → Paid, auto-trigger survey
@router.patch("/{patient_id}/billing")
async def update_billing_status(patient_id: str, body: BillingUpdateRequest):
    db = get_db()
    await db.patients.update_one(
        {"patientId": patient_id},
        {"$set": {"billingStatus": body.billingStatus, "updatedAt": datetime.utcnow()}}
    )

    result = {"patientId": patient_id, "billingStatus": body.billingStatus, "surveySent": False}

    # Auto-trigger survey when marked Paid/Discharged
    if body.billingStatus in ["Paid", "Discharged"]:
        survey_url = f"http://localhost:3000/survey/{patient_id}"
        survey_result = await send_survey(patient_id, survey_url)
        result["surveySent"] = True
        result["surveyUrl"] = survey_result["surveyUrl"]

    return result

@router.get("")
async def get_patients():
    db = get_db()
    patients = await db.patients.find().to_list(length=100)
    for p in patients:
        p["_id"] = str(p["_id"])
    return patients

# Simulated tool: get_discharged_patients(date)
@router.get("/discharged")
async def get_discharged_patients(date: str = None): # type: ignore
    db = get_db()
    query = {"billingStatus": {"$in": ["Paid", "Discharged"]}}
    patients = await db.patients.find(query).to_list(length=100)
    for p in patients:
        p["_id"] = str(p["_id"])
    return patients