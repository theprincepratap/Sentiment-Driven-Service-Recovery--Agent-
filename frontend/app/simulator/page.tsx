"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import {
  getPatients, updateBillingStatus, submitFeedback
} from "@/lib/api";

const SAMPLE_FEEDBACKS = [
  "The nurse was extremely rude and dismissive when I asked about my medication. I waited over 3 hours with no update.",
  "The bathroom was not cleaned for two days and the food was cold every single meal.",
  "The doctor was incredibly thorough and explained everything clearly. Very impressed with the care.",
  "Excellent staff, very attentive. I felt safe and well looked after throughout my stay.",
  "The billing process was confusing and I was charged for services I didn't receive.",
];

const STEPS = [
  { id: 1, label: "Select Patient", icon: "👤" },
  { id: 2, label: "Mark as Discharged", icon: "🏥" },
  { id: 3, label: "Survey Triggered", icon: "📱" },
  { id: 4, label: "Submit Feedback", icon: "✍️" },
  { id: 5, label: "AI Analysis", icon: "🤖" },
  { id: 6, label: "Result", icon: "✅" },
];

export default function SimulatorPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    getPatients().then(setPatients).catch(console.error);
  }, []);

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const handleSelectPatient = (p: any) => {
    setSelected(p);
    setStep(2);
    setResult(null);
    setLog([]);
    addLog(`Patient selected: ${p.name} (${p.patientId}) — ${p.department}`);
  };

  const handleDischarge = async () => {
    setLoading(true);
    addLog(`Marking ${selected.patientId} billing as Paid...`);
    try {
      await updateBillingStatus(selected.patientId, "Paid");
      addLog("✅ Billing status → Paid");
      addLog("📱 Survey link auto-triggered via WhatsApp (simulated)");
      setStep(3);
      setTimeout(() => setStep(4), 1500);
    } catch {
      addLog("❌ Failed to update billing");
    }
    setLoading(false);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setLoading(true);
    setStep(5);
    addLog("Sending feedback to Gemini for analysis...");
    try {
      const res = await submitFeedback({
        patientId: selected.patientId,
        patientName: selected.name,
        department: selected.department,
        rawText: feedbackText,
      });
      setResult(res);
      addLog(`✅ Sentiment: ${res.analysis.sentiment} | Severity: ${res.analysis.severity}/5`);
      addLog(`📂 Category: ${res.analysis.category}`);
      if (res.step3_ticketCreated) addLog(`🎫 Ticket created: ${res.step3_ticketCreated}`);
      if (res.step3_managerNotified) addLog("🚨 Duty Manager notified (15-min SLA started)");
      if (res.step4_resolutionSent) addLog("💬 Personalized resolution message sent to patient");
      if (res.step5_reviewNudgeSent) addLog("⭐ Google Review nudge sent to patient");
      setStep(6);
    } catch {
      addLog("❌ Analysis failed. Is backend running?");
      setStep(4);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setStep(1);
    setSelected(null);
    setFeedbackText("");
    setResult(null);
    setLog([]);
  };

  const getSentimentColor = (s: string) => {
    if (s === "Negative") return "text-red-400 bg-red-900/30 border-red-700";
    if (s === "Positive") return "text-green-400 bg-green-900/30 border-green-700";
    return "text-yellow-400 bg-yellow-900/30 border-yellow-700";
  };

  const getSeverityColor = (n: number) => {
    if (n >= 4) return "bg-red-500";
    if (n >= 3) return "bg-orange-500";
    if (n >= 2) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div>
      <TopBar title="🧪 Patient Simulator" subtitle="Simulate the full service recovery flow for the evaluator demo" />

      {/* Step Progress */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              step === s.id ? "bg-indigo-600 text-white" :
              step > s.id ? "bg-green-700/40 text-green-300" :
              "bg-gray-800 text-gray-500"
            }`}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`text-lg ${step > s.id ? "text-green-400" : "text-gray-700"}`}>→</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Main Interaction */}
        <div className="lg:col-span-2 space-y-6">

          {/* Step 1 — Select Patient */}
          {step === 1 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-white font-semibold text-lg mb-4">👤 Step 1: Select a Patient</h2>
              <p className="text-gray-400 text-sm mb-4">Choose from the 10 seeded discharged patients</p>
              {patients.length === 0 ? (
                <p className="text-gray-500 text-sm">Loading patients... (make sure backend is running)</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {patients.map((p) => (
                    <button
                      key={p.patientId}
                      onClick={() => handleSelectPatient(p)}
                      className="text-left p-4 bg-gray-800 hover:bg-indigo-900/40 border border-gray-700 hover:border-indigo-500 rounded-lg transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-sm">
                          {p.name[0]}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{p.name}</p>
                          <p className="text-gray-400 text-xs">{p.patientId} · {p.department}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Mark Discharged */}
          {step === 2 && selected && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-white font-semibold text-lg mb-4">🏥 Step 2: Mark Billing as Paid</h2>
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-xl">
                    {selected.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{selected.name}</p>
                    <p className="text-gray-400 text-sm">{selected.patientId} · {selected.department}</p>
                    <p className="text-gray-500 text-xs">{selected.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-700 px-2 py-1 rounded">
                    Current: {selected.billingStatus || "Admitted"}
                  </span>
                  <span className="text-gray-500 text-xs">→</span>
                  <span className="text-xs bg-green-900/40 text-green-400 border border-green-700 px-2 py-1 rounded">
                    New: Paid
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                This triggers <strong className="text-white">Step 1</strong> of the agent — automatically sends a WhatsApp survey link to the patient.
              </p>
              <button
                onClick={handleDischarge}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
              >
                {loading ? "Processing..." : "✅ Confirm Discharge & Trigger Survey"}
              </button>
            </div>
          )}

          {/* Step 3 — Survey Triggered animation */}
          {step === 3 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center">
              <div className="text-6xl mb-4">📱</div>
              <h2 className="text-white font-semibold text-lg">Survey Sent!</h2>
              <p className="text-gray-400 text-sm mt-2">WhatsApp survey link dispatched to {selected?.name}...</p>
              <div className="mt-4 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}

          {/* Step 4 — Submit Feedback */}
          {step === 4 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-white font-semibold text-lg mb-2">✍️ Step 4: Patient Submits Feedback</h2>
              <p className="text-gray-400 text-sm mb-4">Simulating the patient's survey response</p>

              <div className="mb-4">
                <label className="text-gray-400 text-xs uppercase tracking-wide mb-2 block">Quick Samples</label>
                <div className="space-y-2">
                  {SAMPLE_FEEDBACKS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setFeedbackText(s)}
                      className="w-full text-left text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 transition-all truncate"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Or type custom feedback here..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-500"
              />

              <button
                onClick={handleSubmitFeedback}
                disabled={!feedbackText.trim() || loading}
                className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-lg transition-all"
              >
                {loading ? "Analyzing with Gemini..." : "🚀 Submit & Analyze"}
              </button>
            </div>
          )}

          {/* Step 5 — Loading */}
          {step === 5 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-10 text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h2 className="text-white font-semibold text-lg">Gemini Analyzing...</h2>
              <p className="text-gray-400 text-sm mt-2">Extracting sentiment, entities, severity...</p>
              <div className="mt-6 flex justify-center">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}

          {/* Step 6 — Result */}
          {step === 6 && result && (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-white font-semibold text-lg mb-4">✅ Analysis Complete</h2>

                {/* Sentiment Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-4 ${getSentimentColor(result.analysis.sentiment)}`}>
                  {result.analysis.sentiment === "Negative" ? "😞" : result.analysis.sentiment === "Positive" ? "😊" : "😐"}
                  {result.analysis.sentiment} Sentiment
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Severity</p>
                    <div className="flex items-center justify-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`w-4 h-4 rounded-sm ${n <= result.analysis.severity ? getSeverityColor(result.analysis.severity) : "bg-gray-700"}`} />
                      ))}
                    </div>
                    <p className="text-white font-bold mt-1">{result.analysis.severity}/5</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Category</p>
                    <p className="text-white text-sm font-medium">{result.analysis.category}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Confidence</p>
                    <p className="text-white text-sm font-medium">{Math.round((result.analysis.sentimentScore || 0) * 100)}%</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Ticket</p>
                    <p className="text-white text-xs font-medium">{result.step3_ticketCreated || "—"}</p>
                  </div>
                </div>

                {/* Complaint Entities */}
                {result.analysis.complaintEntities?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Extracted Entities</p>
                    <div className="flex flex-wrap gap-2">
                      {result.analysis.complaintEntities.map((e: string, i: number) => (
                        <span key={i} className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700 px-2 py-1 rounded-full">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">AI Summary</p>
                  <p className="text-gray-200 text-sm">{result.analysis.summary}</p>
                </div>

                {/* Resolution Message */}
                {result.analysis.resolutionMessage && (
                  <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4 mb-4">
                    <p className="text-indigo-300 text-xs uppercase tracking-wide mb-1">💬 Resolution Message Sent to Patient</p>
                    <p className="text-gray-200 text-sm italic">"{result.analysis.resolutionMessage}"</p>
                  </div>
                )}

                {/* Actions Taken */}
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Actions Taken</p>
                  <div className="space-y-2">
                    {[
                      { key: "step3_ticketCreated", label: "CRM Ticket Created", icon: "🎫" },
                      { key: "step3_managerNotified", label: "Duty Manager Notified (15-min SLA)", icon: "🚨" },
                      { key: "step4_resolutionSent", label: "Personalized Resolution Message Sent", icon: "💬" },
                      { key: "step5_reviewNudgeSent", label: "Google Review Nudge Sent", icon: "⭐" },
                    ].map(({ key, label, icon }) => (
                      <div key={key} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                        result[key] ? "bg-green-900/20 text-green-300" : "bg-gray-800 text-gray-600"
                      }`}>
                        <span>{result[key] ? "✅" : "⬜"}</span>
                        <span>{icon} {label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all"
              >
                🔄 Simulate Another Patient
              </button>
            </div>
          )}
        </div>

        {/* Right — Live Log */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Agent Log
          </h3>
          {log.length === 0 ? (
            <p className="text-gray-600 text-xs">Agent activity will appear here...</p>
          ) : (
            <div className="space-y-2">
              {log.map((l, i) => (
                <div key={i} className="text-xs text-gray-300 bg-gray-800 rounded px-3 py-2 font-mono border-l-2 border-indigo-500">
                  {l}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}