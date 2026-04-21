import { useState } from "react";
import emailjs from "@emailjs/browser";
import { Panel } from "../App";

const SERVICE_ID = "service_74zznfb";
const TEMPLATE_ID = "template_bl3ru6b";
const PUBLIC_KEY = "my0XXtzejINkKbVI_";

const inputStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1.5px solid #cbd5e1",
  fontSize: 15,
  width: "100%",
  background: "#ffffff",
  outline: "none",
  color: "#0f172a",
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
      alert("Please fill in the issue type and message.");
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
      alert("Got it. Fix incoming... 🔧");
      setIssueType("");
      setMessage("");
      setEmail("");
    } catch (err) {
      console.error("Failed to send feedback:", err);
      alert("Even this broke 🤣 Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="🔔 Snitch Box"
        subtitle="Something broke? Attendance messed up? Spill it here — I'll fix it faster than your teacher marks attendance 🔧 Or just drop a message — I'm always listening 👀"
      >
        <div
          className="surface-card surface-card--highlight rise-in"
          style={{
            display: "grid",
            gap: 18,
            padding: 22,
            borderRadius: 22,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94))",
          }}
        >
          {/* Issue Type */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
              Issue Type
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              style={inputStyle}
            >
              <option value="" disabled>Pick one</option>
              <option value="app-broke">💥 App broke</option>
              <option value="attendance-messed-up">📊 Attendance messed up</option>
              <option value="idea">💡 I have an idea</option>
              <option value="weird">🤔 Something weird happened</option>
            </select>
          </div>

          {/* Message */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
              What Happened
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What did the teacher mess up today? 👀"
              rows={7}
              style={{ ...inputStyle, resize: "vertical", minHeight: 160 }}
            />
          </div>

          {/* Email */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
              Email (Optional)
            </label>
            <input
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
              {sending ? "Sending..." : "📢 Snitch Now 🔔"}
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}
