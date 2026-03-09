"""
Gemini Function-Calling Agent for Hospital Service Recovery.
This agent autonomously runs the full feedback loop:
1. Get discharged patients
2. Send surveys
3. Collect responses
4. Analyze sentiment
5. Route based on outcome (create ticket + notify manager OR send review nudge)
6. Send personalized resolution message
7. Detect and escalate repeated complaints
"""

import os
import json
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai
from agent.tools import (
    get_discharged_patients, send_survey, get_survey_response,
    analyze_sentiment, create_crm_ticket, notify_duty_manager,
    send_resolution_message, send_review_nudge, get_state, reset_state,
    TOOL_FUNCTIONS
)
from agent.mock_data import MANAGER_DIRECTORY

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

SYSTEM_PROMPT = """
You are a Hospital Service Recovery AI Agent. Your job is to run a complete closed-loop 
patient feedback workflow for today's discharged patients.

Follow this exact workflow for EACH patient:

STEP 1: Call get_discharged_patients to get today's discharged list.

STEP 2: For each patient, call send_survey to send them a feedback survey via WhatsApp.

STEP 3: For each patient, call get_survey_response to check if they responded.

STEP 4: If a response exists, call analyze_sentiment on the response text.

STEP 5: Based on sentiment:
  — If NEGATIVE:
      a. Call create_crm_ticket with category, severity, and description
      b. Call notify_duty_manager with HIGH urgency
      c. Call send_resolution_message with a PERSONALIZED message addressing their 
         specific complaint (not generic). Include the manager's name as point-of-contact.
         The message must acknowledge the specific complaint entity found.
  — If POSITIVE:
      a. Call send_review_nudge to send a Google Review request
  — If NEUTRAL:
      a. Call send_resolution_message with a thank you + improvement message

STEP 6: After processing all patients, summarize:
  - Total patients processed
  - How many negative/positive/neutral
  - Tickets created
  - Any escalations triggered
  - Total messages sent

Be thorough. Process ALL patients who have survey responses. Use real patient names 
and specific complaint details in the resolution messages. 
Point-of-contact should be the duty manager from the patient's department.
"""

# Gemini function declarations for all 7 tools
TOOL_DECLARATIONS = [
    {
        "name": "get_discharged_patients",
        "description": "Returns list of patients discharged today whose billing is cleared.",
        "parameters": {
            "type": "object",
            "properties": {
                "query_date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. Defaults to today."
                }
            }
        }
    },
    {
        "name": "send_survey",
        "description": "Sends a post-discharge feedback survey to a patient via WhatsApp/SMS.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string", "description": "The patient's unique ID"},
                "channel": {"type": "string", "description": "Communication channel: WhatsApp or SMS"}
            },
            "required": ["patient_id"]
        }
    },
    {
        "name": "get_survey_response",
        "description": "Retrieves the patient's survey response if submitted.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string", "description": "The patient's unique ID"}
            },
            "required": ["patient_id"]
        }
    },
    {
        "name": "analyze_sentiment",
        "description": "Analyzes patient feedback text. Returns sentiment (Positive/Neutral/Negative), emotion, complaint entities, and severity score.",
        "parameters": {
            "type": "object",
            "properties": {
                "response_text": {"type": "string", "description": "Raw patient feedback text"},
                "patient_id": {"type": "string", "description": "Patient ID for context"}
            },
            "required": ["response_text"]
        }
    },
    {
        "name": "create_crm_ticket",
        "description": "Creates a CRM complaint ticket for a negative feedback case.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "category": {"type": "string", "description": "Complaint category e.g. wait_time, staff_behavior, billing_error"},
                "severity": {"type": "integer", "description": "Severity score 1-5"},
                "description": {"type": "string", "description": "Full complaint description with patient quote"}
            },
            "required": ["patient_id", "category", "severity", "description"]
        }
    },
    {
        "name": "notify_duty_manager",
        "description": "Sends a real-time push alert to the duty manager for a ticket.",
        "parameters": {
            "type": "object",
            "properties": {
                "manager_id": {"type": "string"},
                "ticket_id": {"type": "string"},
                "urgency": {"type": "string", "description": "Urgency level: HIGH, MEDIUM, or LOW"},
                "department": {"type": "string", "description": "Department name to find the right manager"}
            },
            "required": ["manager_id", "ticket_id", "urgency"]
        }
    },
    {
        "name": "send_resolution_message",
        "description": "Sends a personalized resolution message to the patient acknowledging their specific complaint.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "contact_name": {"type": "string", "description": "Named point-of-contact (duty manager name)"},
                "personalized_message": {"type": "string", "description": "Personalized message addressing the specific complaint"}
            },
            "required": ["patient_id", "contact_name", "personalized_message"]
        }
    },
    {
        "name": "send_review_nudge",
        "description": "Sends a Google Review request to a satisfied patient.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"}
            },
            "required": ["patient_id"]
        }
    }
]


def _execute_tool(tool_name: str, tool_args: dict) -> str:
    """Execute a tool by name and return JSON result."""
    fn = TOOL_FUNCTIONS.get(tool_name)
    if not fn:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})
    try:
        result = fn(**tool_args)
        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


async def run_agent(use_gemini: bool = True) -> dict:
    """
    Run the full service recovery agent.
    Returns the complete execution trace + final summary.
    """
    reset_state()
    steps = []
    start_time = datetime.utcnow()

    def add_step(step_type: str, content: dict):
        steps.append({
            "step_type": step_type,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })

    add_step("agent_start", {
        "message": "🏥 Hospital Service Recovery Agent started",
        "date": str(datetime.utcnow().date()),
        "mode": "Gemini AI" if use_gemini else "Simulation (no API key)"
    })

    if use_gemini and os.getenv("GOOGLE_API_KEY") and os.getenv("GOOGLE_API_KEY") != "your_google_gemini_api_key_here":
        # ── GEMINI FUNCTION-CALLING AGENT LOOP ────────────────────────────────
        CANDIDATE_MODELS = [
            "gemini-3.1-flash-lite-preview",
            "gemini-3.1-flash-preview",
            "gemini-3.1-pro-preview",
            "gemini-3-flash-preview",
            "gemini-3-pro-preview",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
        ]
        try:
            # Auto-detect working model
            model = None
            used_model = None
            for m in CANDIDATE_MODELS:
                try:
                    model = genai.GenerativeModel(
                        model_name=m,
                        tools=[{"function_declarations": TOOL_DECLARATIONS}],
                        system_instruction=SYSTEM_PROMPT
                    )
                    # Don't test model - just try to use it
                    used_model = m
                    add_step("model_selected", {"message": f"Using Gemini model: {m}"})
                    break
                except Exception as e:
                    print(f"⚠️ Model {m} unavailable: {e}")
                    continue

            if model is None:
                raise Exception("No available Gemini model found. Falling back to simulation.")

            chat = model.start_chat()
            response = chat.send_message("Start the service recovery workflow for today's discharged patients.")

            iteration = 0
            max_iterations = 60  # Safety limit

            while iteration < max_iterations:
                iteration += 1
                candidate = response.candidates[0]

                # Check for function calls
                function_calls = [
                    part.function_call
                    for part in candidate.content.parts
                    if hasattr(part, "function_call") and part.function_call
                ]

                if not function_calls:
                    # Agent finished — get final text
                    final_text = "".join(
                        part.text for part in candidate.content.parts
                        if hasattr(part, "text")
                    )
                    add_step("agent_complete", {"summary": final_text})
                    break

                # Execute each tool call
                tool_results = []
                for fc in function_calls:
                    tool_name = fc.name
                    tool_args = dict(fc.args)

                    add_step("tool_call", {
                        "tool": tool_name,
                        "args": tool_args,
                    })

                    result_json = _execute_tool(tool_name, tool_args)
                    result_dict = json.loads(result_json)

                    add_step("tool_result", {
                        "tool": tool_name,
                        "result": result_dict
                    })

                    tool_results.append({
                        "function_response": {
                            "name": tool_name,
                            "response": {"result": result_json}
                        }
                    })

                # Send results back to Gemini
                response = chat.send_message(tool_results)

        except Exception as e:
            add_step("error", {"message": f"Gemini error: {str(e)}. Falling back to simulation."})
            use_gemini = False

    if not use_gemini or os.getenv("GOOGLE_API_KEY") == "your_google_gemini_api_key_here":
        # ── RULE-BASED SIMULATION (no API key needed) ────────────────────────
        add_step("mode", {"message": "Running in simulation mode (no Gemini API key required)"})

        # Step 1: Get patients
        patients_result = get_discharged_patients()
        add_step("tool_call", {"tool": "get_discharged_patients", "args": {}})
        add_step("tool_result", {"tool": "get_discharged_patients", "result": patients_result})

        patients = patients_result["patients"]

        # Step 2-6: Process each patient with a response
        from agent.mock_data import SURVEY_RESPONSES, MANAGER_DIRECTORY
        for patient in patients:
            pid = patient["patient_id"]
            dept = patient["department"]
            mgr = MANAGER_DIRECTORY.get(dept, {})
            mgr_id = mgr.get("manager_id", "MGR-001")
            mgr_name = mgr.get("name", "Duty Manager")

            # Send survey
            survey_result = send_survey(pid, "WhatsApp")
            add_step("tool_call", {"tool": "send_survey", "args": {"patient_id": pid}})
            add_step("tool_result", {"tool": "send_survey", "result": survey_result})

            # Get response
            resp_result = get_survey_response(pid)
            add_step("tool_call", {"tool": "get_survey_response", "args": {"patient_id": pid}})
            add_step("tool_result", {"tool": "get_survey_response", "result": resp_result})

            if resp_result.get("status") != "received":
                add_step("info", {"message": f"No response yet from {patient['name']} — skipping analysis."})
                continue

            # Analyze sentiment
            analysis = analyze_sentiment(resp_result["response"], pid)
            add_step("tool_call", {"tool": "analyze_sentiment", "args": {"patient_id": pid}})
            add_step("tool_result", {"tool": "analyze_sentiment", "result": analysis})

            sentiment = analysis["sentiment"]
            entities = analysis["complaint_entities"]
            primary_cat = analysis["primary_category"]
            severity = analysis["overall_severity"]

            if sentiment == "Negative":
                # Create CRM ticket
                description = (
                    f"Patient {patient['name']} from {dept} reported: \"{resp_result['response'][:200]}\". "
                    f"Primary complaint: {primary_cat}. Severity: {severity}/5."
                )
                ticket_result = create_crm_ticket(pid, primary_cat, severity, description)
                add_step("tool_call", {"tool": "create_crm_ticket", "args": {"patient_id": pid, "category": primary_cat, "severity": severity}})
                add_step("tool_result", {"tool": "create_crm_ticket", "result": ticket_result})

                ticket_id = ticket_result["ticket_id"]

                # Alert manager
                alert_result = notify_duty_manager(mgr_id, ticket_id, "HIGH", dept)
                add_step("tool_call", {"tool": "notify_duty_manager", "args": {"manager_id": mgr_id, "ticket_id": ticket_id, "urgency": "HIGH"}})
                add_step("tool_result", {"tool": "notify_duty_manager", "result": alert_result})

                # Personalized resolution message
                entity_labels = [e["entity"].replace("_", " ") for e in entities]
                specific_complaint = " and ".join(entity_labels) if entity_labels else primary_cat.replace("_", " ")
                personalized_msg = (
                    f"Dear {patient['name']}, we sincerely apologize for your experience "
                    f"regarding {specific_complaint} during your recent visit to our {dept} department. "
                    f"We have logged a priority complaint and your case (Ticket {ticket_id}) "
                    f"is being personally reviewed by {mgr_name}. "
                    f"You will receive a direct callback within 15 minutes. "
                    f"Thank you for bringing this to our attention — your feedback directly "
                    f"improves our service."
                )
                msg_result = send_resolution_message(pid, mgr_name, personalized_msg)
                add_step("tool_call", {"tool": "send_resolution_message", "args": {"patient_id": pid, "contact_name": mgr_name}})
                add_step("tool_result", {"tool": "send_resolution_message", "result": msg_result})

                # Check if auto-escalated
                if ticket_result.get("auto_escalated"):
                    add_step("escalation", {
                        "message": f"🚨 AUTO-ESCALATION triggered for {dept}/{primary_cat}",
                        "details": ticket_result.get("escalation")
                    })

            elif sentiment == "Positive":
                # Google Review nudge
                nudge_result = send_review_nudge(pid)
                add_step("tool_call", {"tool": "send_review_nudge", "args": {"patient_id": pid}})
                add_step("tool_result", {"tool": "send_review_nudge", "result": nudge_result})

            else:  # Neutral
                neutral_msg = (
                    f"Dear {patient['name']}, thank you for sharing your feedback about your "
                    f"stay in our {dept} department. We appreciate your honest assessment "
                    f"and are always working to improve. If you have any specific suggestions, "
                    f"please reach out to us at feedback@hospital.com. — {mgr_name}"
                )
                msg_result = send_resolution_message(pid, mgr_name, neutral_msg)
                add_step("tool_call", {"tool": "send_resolution_message", "args": {"patient_id": pid}})
                add_step("tool_result", {"tool": "send_resolution_message", "result": msg_result})

        add_step("agent_complete", {"message": "✅ All patients processed. Service recovery loop complete."})

    # Final state
    state = get_state()
    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()

    return {
        "status": "complete",
        "duration_seconds": round(duration, 2),
        "steps": steps,
        "summary": {
            "patients_total": 10,
            "surveys_sent": len(state["sent_surveys"]),
            "responses_received": len([s for s in state["tool_log"] if s["tool"] == "get_survey_response" and s["output"].get("status") == "received"]),
            "tickets_created": len(state["crm_tickets"]),
            "manager_alerts_sent": len(state["manager_alerts"]),
            "messages_sent": len(state["sent_messages"]),
            "escalations": len(state["escalations"]),
            "crm_tickets": state["crm_tickets"],
            "escalation_details": state["escalations"],
        }
    }
