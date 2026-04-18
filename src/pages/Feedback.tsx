import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import { Panel, primaryButtonStyle } from "../App";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 15,
  boxSizing: "border-box" as const,
};

const SERVICE_ID = "service_74zznfb";
const TEMPLATE_ID = "template_bl3ru6b";
const PUBLIC_KEY = "my0XXtzejINkKbVI_";

export function Feedback() {
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  async function sendFeedback() {
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          type,
          message,
          user_email: userEmail,
        },
        PUBLIC_KEY,
      );

      alert("😏 Got it. Fix incoming...");
    } catch (error) {
      console.error("Failed to send feedback:", error);
      alert("💀 Even this broke… try again");
    }
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="😈 Snitch Box"
        subtitle="Something broke? Attendance messed up? Spill it here… I’ll fix it faster than your teacher marks attendance 😏 Or just drop a message — I’m always listening 👀"
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
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Issue Type</label>
            <select value={type} onChange={(event) => setType(event.target.value)} style={inputStyle}>
              <option value="" disabled>
                Pick one
              </option>
              <option value="app-broke">🐞 App broke</option>
              <option value="attendance-messed-up">📉 Attendance messed up</option>
              <option value="idea">💡 I have an idea</option>
              <option value="weird">🤡 Something weird happened</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>What Happened</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What did the teacher mess up today? 👀"
              rows={7}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 160,
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
              Email (Optional)
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(event) => setUserEmail(event.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              type="button"
              className="action-button action-button--primary"
              onClick={() => void sendFeedback()}
              style={primaryButtonStyle(false)}
            >
              📩 Snitch Now 😈
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}
