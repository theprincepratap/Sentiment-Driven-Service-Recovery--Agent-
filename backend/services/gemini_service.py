from google import genai
from google.genai import types
import json
from db.database import get_settings

settings = get_settings()
client = genai.Client(api_key=settings.GEMINI_API_KEY)

async def analyze_feedback(raw_text: str, patient_name: str, department: str) -> dict:
    prompt = f"""
You are a hospital patient feedback analyzer. Analyze the following patient feedback and return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

Patient Name: {patient_name}
Department: {department}
Feedback: "{raw_text}"

Return exactly this JSON structure:
{{
  "sentiment": "Positive or Neutral or Negative",
  "sentimentScore": 0.0,
  "severity": 1,
  "category": "Staff Behavior",
  "complaintEntities": ["entity1", "entity2"],
  "summary": "one sentence summary",
  "resolutionMessage": "personalized message to patient"
}}

Category must be one of: Staff Behavior, Wait Time, Cleanliness, Billing Error, Facilities, Food Quality, General Positive, General Neutral

Severity rules:
1 = minor/positive, 2 = small issue, 3 = moderate complaint, 4 = serious urgent, 5 = critical safety/legal

resolutionMessage rules:
- Mention the specific complaint (not generic)
- Show empathy and give a concrete next step
- Provide a named point of contact
- Keep it under 100 words
- Sign off as Hospital Management Team
"""
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )
    text = response.text.strip() # type: ignore
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)


async def generate_weekly_summary(feedback_list: list) -> dict:
    prompt = f"""
You are a hospital analytics AI. Based on these patient feedbacks from this week, generate a summary report.
Return ONLY valid JSON, no markdown, no code blocks.

Feedbacks:
{json.dumps(feedback_list, indent=2, default=str)}

Return exactly:
{{
  "topComplaintCategories": [{{"category": "...", "count": 0}}],
  "departmentRiskSummary": [{{"department": "...", "riskLevel": "Low or Medium or High or Critical", "mainIssue": "..."}}],
  "overallInsight": "2-3 sentence insight about this week",
  "recommendedActions": ["action1", "action2", "action3"]
}}
"""
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )
    text = response.text.strip() # type: ignore
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)