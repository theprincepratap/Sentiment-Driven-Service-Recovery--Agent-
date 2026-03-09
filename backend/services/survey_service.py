# services/survey_service.py
from datetime import datetime
from db.database import get_db

# Simulated tool: send_survey(patient_id, survey_url)
async def send_survey(patient_id: str, survey_url: str) -> dict:
    db = get_db()
    # In production: call WhatsApp/SMS API here
    # For hackathon: simulate and log it
    print(f"📱 [SIMULATED] Survey sent to patient {patient_id} → {survey_url}")

    await db.patients.update_one(
        {"patientId": patient_id},
        {"$set": {
            "surveyStatus": "sent",
            "surveyUrl": survey_url,
            "surveySentAt": datetime.utcnow()
        }}
    )
    return {"sent": True, "patientId": patient_id, "surveyUrl": survey_url}


# Simulated tool: get_survey_response(patient_id)
async def get_survey_response(patient_id: str) -> dict:
    db = get_db()
    # In production: fetch from WhatsApp webhook or form response
    # For hackathon: return whatever raw text is stored on patient record
    patient = await db.patients.find_one({"patientId": patient_id})
    if not patient or not patient.get("surveyResponse"):
        return {"patientId": patient_id, "response": None, "hasResponse": False}
    return {
        "patientId": patient_id,
        "response": patient["surveyResponse"],
        "hasResponse": True
    }


# Simulated tool: send_resolution_message(patient_id, contact_name, personalized_message)
async def send_resolution_message(patient_id: str, contact_name: str, message: str) -> dict:
    db = get_db()
    print(f"💬 [SIMULATED] Resolution message sent to {patient_id}")
    print(f"   Contact: {contact_name}")
    print(f"   Message: {message}")

    await db.feedbacks.update_one(
        {"patientId": patient_id},
        {"$set": {
            "resolutionMessageSent": True,
            "resolutionSentAt": datetime.utcnow(),
            "resolutionContact": contact_name
        }},
        sort=[("createdAt", -1)] # type: ignore
    )
    return {"sent": True, "patientId": patient_id, "contact": contact_name}


# Simulated tool: send_google_review_nudge for Positive sentiment
async def send_review_nudge(patient_id: str, patient_name: str) -> dict:
    review_link = "https://g.page/r/hospital-google-review-link"
    message = (
        f"Dear {patient_name}, thank you for choosing us! "
        f"We're so glad your experience was positive. "
        f"Would you mind sharing it? It takes just 30 seconds: {review_link} 🙏"
    )
    print(f"⭐ [SIMULATED] Google Review nudge sent to {patient_id}: {message}")

    db = get_db()
    await db.feedbacks.update_one(
        {"patientId": patient_id},
        {"$set": {"reviewNudgeSent": True}},
        sort=[("createdAt", -1)] # type: ignore
    )
    return {"sent": True, "patientId": patient_id, "reviewLink": review_link}