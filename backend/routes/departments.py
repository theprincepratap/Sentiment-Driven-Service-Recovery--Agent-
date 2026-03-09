from fastapi import APIRouter
from db.mongodb import get_db
from datetime import datetime

router = APIRouter()


@router.get("/departments/heatmap")
async def get_department_heatmap():
    db = get_db()
    pipeline = [
        {"$match": {"analysis": {"$exists": True}}},
        {"$group": {
            "_id": "$department",
            "total": {"$sum": 1},
            "negative": {
                "$sum": {"$cond": [{"$eq": ["$analysis.sentiment", "Negative"]}, 1, 0]}
            },
            "avg_severity": {"$avg": "$analysis.severity"},
            "categories": {"$push": "$analysis.category"}
        }},
        {"$sort": {"negative": -1}}
    ]
    results = await db.feedback.aggregate(pipeline).to_list(20)

    heatmap_data = []
    for r in results:
        # Count most common category
        from collections import Counter
        cats = [c for c in r.get("categories", []) if c]
        top_cat = Counter(cats).most_common(1)[0][0] if cats else "other"

        heatmap_data.append({
            "department": r["_id"],
            "total_feedback": r["total"],
            "negative_count": r["negative"],
            "avg_severity": round(r.get("avg_severity") or 0, 1),
            "top_category": top_cat,
            "risk_score": round(
                (r["negative"] / r["total"] * 100) if r["total"] > 0 else 0, 1
            )
        })

    return heatmap_data


@router.get("/departments")
async def get_departments():
    db = get_db()
    cursor = db.departments.find({})
    depts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        depts.append(doc)
    return depts
