import { useState } from "react";
import emailjs from "@emailjs/browser";
import { Panel } from "../components/UI";

const SERVICE_ID = "service_74zznfb";
const TEMPLATE_ID = "template_bl3ru6b";
const PUBLIC_KEY = "my0XXtzejINkKbVI_";

const inputStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  fontSize: 15,
  width: "100%",
  background: "var(--bg-card)",
  outline: "none",
  color: "var(--text-primary)",
  fontWeight: 500,
  fontFamily: "inherit",
  boxSizing: "border-box" as const,
};

export function Snitch() {
  const [issueType, setIssueType] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!issueType || !message.trim()) {
      alert("Select an issue type and describe what happened.");
      return;
    }

    setSending(true);
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        { type: issueType, message, user_email: email },
        PUBLIC_KEY,
      );
      alert("Thanks. Your report has been sent.");
      setIssueType("");
      setMessage("");
      setEmail("");
    } catch (err) {
      console.error("Failed to send feedback:", err);
      alert("Couldn't send the report. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="Report attendance issues"
        subtitle="Something wrong with today's attendance? Let me know."
      >
        <div
          className="standard-card rise-in border-l-warning"
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          {/* Issue Type */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
              Issue type
            </label>
            <select
              className="standard-input"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              style={inputStyle}
            >
              <option value="" disabled>Pick one</option>
              <option value="app-broke">App issue</option>
              <option value="attendance-messed-up">Attendance issue</option>
              <option value="idea">Idea</option>
              <option value="weird">Something else</option>
            </select>
          </div>

          {/* Message */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
              What happened?
            </label>
            <textarea
              className="standard-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell me what looks wrong."
              rows={7}
              style={{ ...inputStyle, resize: "vertical", minHeight: 160 }}
            />
          </div>

          {/* Email */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
              Email (optional)
            </label>
            <input
              className="standard-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          {/* Submit */}
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              type="button"
              className="action-button action-button--primary"
              onClick={() => void handleSend()}
              disabled={sending}
              style={{
                padding: "12px 28px",
                opacity: sending ? 0.7 : 1,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Sending..." : "Send report"}
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}
