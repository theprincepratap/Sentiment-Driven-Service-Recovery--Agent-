import google.generativeai as genai
import json
import os
import re
from dotenv import load_dotenv
from models.schemas import GeminiAnalysis

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

PROMPT_TEMPLATE = """
You are a hospital patient experience AI analyst. Analyze the following patient feedback and return ONLY a valid JSON object with no extra text, markdown, or code blocks.

Patient Feedback: "{feedback}"

Return this exact JSON structure:
{{
  "sentiment": "<Positive|Negative|Neutral>",
  "emotion": "<e.g. Angry|Frustrated|Satisfied|Happy|Anxious|Disappointed|Grateful|Neutral>",
  "category": "<e.g. staff_behavior|wait_time|cleanliness|facilities|communication|billing|treatment_quality|food|discharge_process|other>",
  "severity": <integer 1-5 where 1=minor concern, 3=moderate, 5=critical>,
  "resolution_message": "<A warm, empathetic personalized response addressing the patient's specific concern>"
}}

Rules:
- severity 1-2: minor/neutral feedback
- severity 3: moderate complaint
- severity 4-5: serious complaint requiring immediate attention
- resolution_message must be at least 2 sentences, empathetic and specific to the complaint
"""


CANDIDATE_MODELS = [
   "gemini-3.1-flash-lite-preview",
   "gemini-3.1-flash-preview",
   "gemini-3.1-pro-preview",
   "gemini-3-flash-preview",
   "gemini-3-pro-preview",
   "gemini-2.5-flash",
   "gemini-2.0-flash",
]


def _get_model():
    """Return the first available Gemini model."""
    for m in CANDIDATE_MODELS:
        try:
            model = genai.GenerativeModel(m)
            # Just try to instantiate - don't actually test with a call
            return model
        except Exception as e:
            print(f"⚠️ Model {m} unavailable: {e}")
            continue
    print("⚠️ No Gemini models available - falling back to simulation")
    return None


async def analyze_feedback(feedback_text: str) -> GeminiAnalysis:
    """Send feedback to Gemini and parse the structured response."""
    try:
        model = _get_model()
        if model is None:
            raise Exception("No available Gemini model")
        prompt = PROMPT_TEMPLATE.format(feedback=feedback_text.replace('"', "'"))
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown code blocks if present
        raw = re.sub(r"```(?:json)?", "", raw).strip()
        raw = raw.strip("`").strip()

        data = json.loads(raw)

        return GeminiAnalysis(
            sentiment=data.get("sentiment", "Neutral"),
            emotion=data.get("emotion", "Neutral"),
            category=data.get("category", "other"),
            severity=int(data.get("severity", 2)),
            resolution_message=data.get("resolution_message", "Thank you for your feedback. We will review it.")
        )

    except json.JSONDecodeError as e:
        print(f"⚠️ Gemini JSON parse error: {e}\nRaw: {raw}")
        return _fallback_analysis(feedback_text)
    except Exception as e:
        print(f"⚠️ Gemini API error: {e}")
        return _fallback_analysis(feedback_text)


def _fallback_analysis(text: str) -> GeminiAnalysis:
    """Rule-based fallback when Gemini is unavailable."""
    text_lower = text.lower()
    negative_words = ["rude", "bad", "terrible", "awful", "wait", "worst", "poor", "slow", "dirty", "ignored", "pain"]
    positive_words = ["great", "excellent", "wonderful", "amazing", "kind", "professional", "fast", "clean", "happy"]

    neg_score = sum(1 for w in negative_words if w in text_lower)
    pos_score = sum(1 for w in positive_words if w in text_lower)

    if neg_score > pos_score:
        sentiment = "Negative"
        emotion = "Frustrated"
        severity = min(2 + neg_score, 5)
        category = "other"
        if "rude" in text_lower or "behavior" in text_lower:
            category = "staff_behavior"
        elif "wait" in text_lower or "hour" in text_lower:
            category = "wait_time"
        elif "clean" in text_lower or "dirty" in text_lower:
            category = "cleanliness"
        resolution_message = ("We sincerely apologize for your experience. "
                               "Our team is reviewing your feedback and will take immediate action to address your concerns.")
    elif pos_score > neg_score:
        sentiment = "Positive"
        emotion = "Satisfied"
        severity = 1
        category = "other"
        resolution_message = ("Thank you so much for your kind words! "
                               "It means a lot to our team to hear such positive feedback.")
    else:
        sentiment = "Neutral"
        emotion = "Neutral"
        severity = 1
        category = "other"
        resolution_message = ("Thank you for sharing your experience with us. "
                               "We value all feedback and use it to improve our services.")

    return GeminiAnalysis(
        sentiment=sentiment,
        emotion=emotion,
        category=category,
        severity=severity,
        resolution_message=resolution_message
    )
