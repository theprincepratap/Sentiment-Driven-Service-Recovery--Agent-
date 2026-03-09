from fastapi import APIRouter
from datetime import datetime, timedelta
from db.mongodb import get_db

router = APIRouter()


@router.get("/dashboard/stats")
async def get_dashboard_stats():
    db = get_db()

    # Total feedback count
    total_feedback = await db.feedback.count_documents({})
    total_tickets = await db.tickets.count_documents({})
    open_tickets = await db.tickets.count_documents({"status": "open"})
    resolved_tickets = await db.tickets.count_documents({"status": "resolved"})
    critical_alerts = await db.tickets.count_documents({"severity": {"$gte": 4}})

    # Sentiment breakdown
    pos = await db.feedback.count_documents({"analysis.sentiment": "Positive"})
    neg = await db.feedback.count_documents({"analysis.sentiment": "Negative"})
    neu = await db.feedback.count_documents({"analysis.sentiment": "Neutral"})

    # Average severity
    pipeline = [
        {"$match": {"analysis.severity": {"$exists": True}}},
        {"$group": {"_id": None, "avg_severity": {"$avg": "$analysis.severity"}}}
    ]
    agg = await db.feedback.aggregate(pipeline).to_list(1)
    avg_severity = round(agg[0]["avg_severity"], 2) if agg else 0

    # Category breakdown
    cat_pipeline = [
        {"$match": {"analysis.category": {"$exists": True}}},
        {"$group": {"_id": "$analysis.category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8}
    ]
    categories = await db.feedback.aggregate(cat_pipeline).to_list(8)
    category_breakdown = [{"category": c["_id"], "count": c["count"]} for c in categories]

    # Recent activity feed (last 20 events from feedback + tickets)
    recent_feedback = []
    cursor = db.feedback.find({}).sort("created_at", -1).limit(10)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        recent_feedback.append({
            "type": "feedback",
            "patient_id": doc.get("patient_id"),
            "department": doc.get("department"),
            "sentiment": doc.get("analysis", {}).get("sentiment", "Unknown") if doc.get("analysis") else "Analyzing...",
            "timestamp": doc["created_at"],
            "message": f"Feedback received from {doc.get('name', 'Patient')} in {doc.get('department')}"
        })

    recent_tickets = []
    cursor2 = db.tickets.find({}).sort("created_at", -1).limit(10)
    async for doc in cursor2:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        recent_tickets.append({
            "type": "ticket",
            "ticket_id": doc.get("ticket_id"),
            "department": doc.get("department"),
            "severity": doc.get("severity"),
            "status": doc.get("status"),
            "timestamp": doc["created_at"],
            "message": f"Ticket {doc.get('ticket_id')} created for {doc.get('department')} (severity {doc.get('severity')})"
        })

    activity_feed = sorted(
        recent_feedback + recent_tickets,
        key=lambda x: x["timestamp"],
        reverse=True
    )[:15]

    return {
        "total_feedback": total_feedback,
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved_tickets,
        "critical_alerts": critical_alerts,
        "sentiment_breakdown": {
            "positive": pos,
            "negative": neg,
            "neutral": neu
        },
        "avg_severity": avg_severity,
        "category_breakdown": category_breakdown,
        "activity_feed": activity_feed
    }
