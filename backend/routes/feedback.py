# routes/feedback.py
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from db.database import get_db
from services.gemini_service import analyze_feedback
from services.ticket_service import create_ticket
from services.notification_service import notify_duty_manager
from services.survey_service import send_resolution_message, send_review_nudge
from services.escalation_service import check_and_escalate
from services.websocket_service import manager as ws_manager

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

class FeedbackRequest(BaseModel):
    patientId: str
    patientName: str
    department: str
    rawText: str

@router.post("/submit")
async def submit_feedback(body: FeedbackRequest):
    db = get_db()

    # STEP 2 — analyze_sentiment() via Gemini
    analysis = await analyze_feedback(body.rawText, body.patientName, body.department)

    # Save feedback to DB
    feedback_doc = {
        "patientId": body.patientId,
        "patientName": body.patientName,
        "department": body.department,
        "rawText": body.rawText,
        **analysis,
        "resolutionMessageSent": False,
        "reviewNudgeSent": False,
        "submittedAt": datetime.utcnow(),
        "createdAt": datetime.utcnow(),
    }
    result = await db.feedbacks.insert_one(feedback_doc)
    feedback_id = str(result.inserted_id)

    ticket = None
    notification = None
    resolution = None
    nudge = None

    if analysis["sentiment"] == "Negative":
        # STEP 3 — create_crm_ticket() + notify_duty_manager()
        ticket = await create_ticket(
            feedback_id=feedback_id,
            patient_id=body.patientId,
            patient_name=body.patientName,
            department=body.department,
            category=analysis["category"],
            severity=analysis["severity"],
            description=analysis["summary"],
        )

        notification = await notify_duty_manager(
            ticket_id=ticket["ticketId"],
            urgency="critical" if analysis["severity"] == 5 else "high",
            title=f"🚨 Critical Complaint — {body.department}",
            message=(
                f"Patient {body.patientName} reported {analysis['category']}. "
                f"Severity: {analysis['severity']}/5. "
                f"\"{analysis['summary']}\" — Respond within 15 minutes."
            )
        )

        # STEP 4 — send_resolution_message() within 5 minutes
        # Get on-duty manager name as named point of contact
        manager_doc = await db.managers.find_one({"role": "Duty Manager", "isOnDuty": True})
        contact_name = manager_doc["name"] if manager_doc else "Our Patient Relations Team"

        resolution = await send_resolution_message(
            patient_id=body.patientId,
            contact_name=contact_name,
            message=analysis["resolutionMessage"]
        )

        # Bonus — escalation check
        await check_and_escalate(body.department, analysis["category"])

    elif analysis["sentiment"] == "Positive":
        # STEP 5 — send Google Review nudge
        nudge = await send_review_nudge(body.patientId, body.patientName)

    # Broadcast real-time update to dashboard
    await ws_manager.broadcast({
        "event": "new_feedback",
        "feedbackId": feedback_id,
        "sentiment": analysis["sentiment"],
        "severity": analysis["severity"],
        "department": body.department,
        "category": analysis["category"],
    })

    return {
        "success": True,
        "feedbackId": feedback_id,
        "analysis": analysis,
        "step2_sentiment": analysis["sentiment"],
        "step3_ticketCreated": ticket["ticketId"] if ticket else None,
        "step3_managerNotified": notification is not None,
        "step4_resolutionSent": resolution is not None,
        "step5_reviewNudgeSent": nudge is not None,
    }

@router.get("/list")
async def list_feedbacks(limit: int = 50):
    db = get_db()
    feedbacks = await db.feedbacks.find().sort("createdAt", -1).to_list(length=limit)
    for f in feedbacks:
        f["_id"] = str(f["_id"])
    return feedbacks