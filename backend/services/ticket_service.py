import uuid
from datetime import datetime, timedelta
from db.mongodb import get_db
from models.schemas import Ticket, TicketStatus, ManagerNotification, GeminiAnalysis
from services.ws_manager import manager as ws_manager


async def create_ticket(
    patient_id: str,
    patient_name: str,
    department: str,
    original_feedback: str,
    analysis: GeminiAnalysis
) -> dict:
    """Create a complaint ticket and store in MongoDB."""
    db = get_db()
    ticket_id = f"TKT-{str(uuid.uuid4())[:8].upper()}"

    # Find assigned manager for department
    mgr = await db.managers.find_one({"department": department})
    assigned_manager = mgr["name"] if mgr else "Duty Manager"

    ticket_doc = {
        "ticket_id": ticket_id,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "department": department,
        "category": analysis.category,
        "severity": analysis.severity,
        "sentiment": analysis.sentiment,
        "emotion": analysis.emotion,
        "original_feedback": original_feedback,
        "resolution_message": analysis.resolution_message,
        "status": TicketStatus.open.value,
        "assigned_manager": assigned_manager,
        "created_at": datetime.utcnow(),
        "resolved_at": None,
        "escalated": False
    }

    await db.tickets.insert_one(ticket_doc)
    ticket_doc.pop("_id", None)

    # Check for repeated complaints → possible escalation
    await check_and_escalate(department, analysis.category)

    return ticket_doc


async def check_and_escalate(department: str, category: str):
    """If same department has 3+ same-category complaints in past 7 days, escalate to dept head."""
    db = get_db()
    one_week_ago = datetime.utcnow() - timedelta(days=7)

    count = await db.tickets.count_documents({
        "department": department,
        "category": category,
        "created_at": {"$gte": one_week_ago}
    })

    if count >= 3:
        # Check if escalation already sent recently
        recent_escalation = await db.tickets.count_documents({
            "department": department,
            "category": category,
            "escalated": True,
            "created_at": {"$gte": one_week_ago}
        })

        if recent_escalation == 0:
            dept = await db.get_db().departments.find_one({"name": department}) if False else \
                   await db.departments.find_one({"name": department})

            head_name = dept["head_name"] if dept else "Department Head"
            head_email = dept["head_email"] if dept else "dept.head@hospital.com"

            escalation_msg = {
                "type": "escalation",
                "department": department,
                "category": category,
                "complaint_count": count,
                "head_name": head_name,
                "head_email": head_email,
                "message": (
                    f"⚠️ ESCALATION: {count} '{category}' complaints in {department} dept "
                    f"this week. Immediate attention required by {head_name}."
                ),
                "timestamp": datetime.utcnow().isoformat()
            }

            # Mark recent tickets as escalated
            await db.tickets.update_many(
                {"department": department, "category": category,
                 "created_at": {"$gte": one_week_ago}},
                {"$set": {"escalated": True}}
            )

            # Broadcast escalation
            await ws_manager.broadcast("escalation", escalation_msg)
            print(f"🚨 Escalation triggered: {escalation_msg['message']}")


async def create_manager_notification(
    department: str,
    patient_id: str,
    severity: int,
    ticket_id: str,
    analysis: GeminiAnalysis
) -> dict:
    """Create and store a manager notification for critical complaints (severity >= 4)."""
    db = get_db()
    mgr = await db.managers.find_one({"department": department})
    manager_name = mgr["name"] if mgr else "Duty Manager"

    notification = {
        "alert_type": "critical_complaint",
        "department": department,
        "patient_id": patient_id,
        "severity": severity,
        "ticket_id": ticket_id,
        "manager_name": manager_name,
        "message": (
            f"🚨 Critical complaint in {department}: {analysis.emotion} patient reported "
            f"'{analysis.category}' issue (severity {severity}/5). Immediate response required."
        ),
        "created_at": datetime.utcnow(),
        "read": False
    }

    await db.notifications.insert_one(notification)
    notification.pop("_id", None)
    notification["created_at"] = notification["created_at"].isoformat()

    return notification
