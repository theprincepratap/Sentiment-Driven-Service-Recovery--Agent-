from fastapi import APIRouter, HTTPException
from datetime import datetime
from db.mongodb import get_db
from models.schemas import FeedbackSubmit
from services.gemini_service import analyze_feedback
from services.ticket_service import create_ticket, create_manager_notification
from services.ws_manager import manager as ws_manager

router = APIRouter()


@router.post("/feedback")
async def submit_feedback(feedback: FeedbackSubmit):
    db = get_db()

    # 1. Store raw feedback
    feedback_doc = {
        "patient_id": feedback.patient_id,
        "department": feedback.department,
        "text": feedback.text,
        "name": feedback.name,
        "created_at": datetime.utcnow()
    }
    result = await db.feedback.insert_one(feedback_doc)

    # 2. Broadcast: feedback received
    await ws_manager.broadcast("new_feedback", {
        "patient_id": feedback.patient_id,
        "department": feedback.department,
        "name": feedback.name,
        "preview": feedback.text[:80],
        "timestamp": datetime.utcnow().isoformat()
    })

    # 3. AI Analysis via Gemini
    analysis = await analyze_feedback(feedback.text)

    # 4. Update feedback doc with analysis
    analysis_dict = analysis.model_dump()
    await db.feedback.update_one(
        {"_id": result.inserted_id},
        {"$set": {"analysis": analysis_dict}}
    )

    # 5. Update department stats
    await db.departments.update_one(
        {"name": feedback.department},
        {"$inc": {"complaint_count": 1 if analysis.sentiment == "Negative" else 0}},
        upsert=True
    )

    # 6. Route based on sentiment
    ticket_doc = None
    notification_doc = None

    if analysis.sentiment == "Negative":
        # Create ticket
        ticket_doc = await create_ticket(
            patient_id=feedback.patient_id,
            patient_name=feedback.name,
            department=feedback.department,
            original_feedback=feedback.text,
            analysis=analysis
        )

        # Broadcast new ticket
        await ws_manager.broadcast("new_ticket", {
            **ticket_doc,
            "created_at": ticket_doc["created_at"].isoformat() if isinstance(ticket_doc.get("created_at"), datetime) else ticket_doc.get("created_at")
        })

        # Critical alert for severity >= 4
        if analysis.severity >= 4:
            notification_doc = await create_manager_notification(
                department=feedback.department,
                patient_id=feedback.patient_id,
                severity=analysis.severity,
                ticket_id=ticket_doc["ticket_id"],
                analysis=analysis
            )
            await ws_manager.broadcast("manager_alert", notification_doc)

    else:
        # Positive: log Google review action
        await ws_manager.broadcast("review_request", {
            "patient_id": feedback.patient_id,
            "department": feedback.department,
            "message": "Google review request triggered for satisfied patient.",
            "timestamp": datetime.utcnow().isoformat()
        })

    return {
        "status": "success",
        "feedback_id": str(result.inserted_id),
        "analysis": analysis_dict,
        "ticket": ticket_doc,
        "notification": notification_doc
    }


@router.get("/feedback")
async def get_all_feedback(limit: int = 50, department: str = None):
    db = get_db()
    query = {}
    if department:
        query["department"] = department
    cursor = db.feedback.find(query).sort("created_at", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        results.append(doc)
    return results
