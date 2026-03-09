from fastapi import APIRouter
from datetime import datetime, timedelta
from db.mongodb import get_db

router = APIRouter()


@router.get("/reports/weekly")
async def get_weekly_report():
    db = get_db()
    now = datetime.utcnow()
    one_week_ago = now - timedelta(days=7)

    # Total in last 7 days
    total = await db.feedback.count_documents({"created_at": {"$gte": one_week_ago}})
    neg = await db.feedback.count_documents({
        "created_at": {"$gte": one_week_ago},
        "analysis.sentiment": "Negative"
    })
    pos = await db.feedback.count_documents({
        "created_at": {"$gte": one_week_ago},
        "analysis.sentiment": "Positive"
    })
    neu = await db.feedback.count_documents({
        "created_at": {"$gte": one_week_ago},
        "analysis.sentiment": "Neutral"
    })

    # Average severity
    sev_pipeline = [
        {"$match": {"created_at": {"$gte": one_week_ago}, "analysis": {"$exists": True}}},
        {"$group": {"_id": None, "avg": {"$avg": "$analysis.severity"}}}
    ]
    sev_agg = await db.feedback.aggregate(sev_pipeline).to_list(1)
    avg_sev = round(sev_agg[0]["avg"], 2) if sev_agg else 0

    # Daily trend (last 7 days)
    daily_trend = []
    for i in range(7):
        day_start = (now - timedelta(days=6-i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_total = await db.feedback.count_documents({
            "created_at": {"$gte": day_start, "$lt": day_end}
        })
        day_neg = await db.feedback.count_documents({
            "created_at": {"$gte": day_start, "$lt": day_end},
            "analysis.sentiment": "Negative"
        })
        daily_trend.append({
            "date": day_start.strftime("%a %b %d"),
            "total": day_total,
            "negative": day_neg,
            "positive": day_total - day_neg
        })

    # Department breakdown
    dept_pipeline = [
        {"$match": {"created_at": {"$gte": one_week_ago}}},
        {"$group": {
            "_id": "$department",
            "total": {"$sum": 1},
            "negative": {
                "$sum": {"$cond": [{"$eq": ["$analysis.sentiment", "Negative"]}, 1, 0]}
            }
        }},
        {"$sort": {"negative": -1}}
    ]
    dept_data = await db.feedback.aggregate(dept_pipeline).to_list(20)
    dept_breakdown = [
        {"department": d["_id"], "total": d["total"], "negative": d["negative"]}
        for d in dept_data
    ]

    # Top complaint categories
    cat_pipeline = [
        {"$match": {"created_at": {"$gte": one_week_ago}, "analysis.sentiment": "Negative"}},
        {"$group": {"_id": "$analysis.category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    cat_data = await db.feedback.aggregate(cat_pipeline).to_list(5)
    top_categories = [{"category": c["_id"], "count": c["count"]} for c in cat_data]

    # Escalations this week
    escalations = await db.tickets.count_documents({
        "created_at": {"$gte": one_week_ago},
        "escalated": True
    })

    return {
        "period": {
            "start": one_week_ago.isoformat(),
            "end": now.isoformat()
        },
        "summary": {
            "total_feedback": total,
            "negative": neg,
            "positive": pos,
            "neutral": neu,
            "avg_severity": avg_sev,
            "escalations": escalations
        },
        "daily_trend": daily_trend,
        "department_breakdown": dept_breakdown,
        "top_categories": top_categories
    }
