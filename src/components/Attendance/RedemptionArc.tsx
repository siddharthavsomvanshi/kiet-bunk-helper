import { useState } from "react";
import type { ScheduleEntry } from "../../types/kiet";

interface BunkableDay {
  dateKey: string;
  label: string;
  entries: ScheduleEntry[];
}

interface OverallSummary {
  present: number;
  total: number;
}

interface RedemptionArcProps {
  data: OverallSummary | null;
  schedule: BunkableDay[];
}

export function RedemptionArc({ data, schedule }: RedemptionArcProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [result, setResult] = useState<{ percentage: number; classesAdded: number } | null>(null);

  const handleCalculate = () => {
    if (!selectedDate || !data) {
      setResult(null);
      return;
    }

    const currentAttended = data.present;
    const currentTotal = data.total;

    let classesAdded = 0;
    
    // Use the exact same filtered and grouped calendar schedule as Attendance Sniper
    for (const day of schedule) {
      // String comparison works perfectly here because both are YYYY-MM-DD
      if (day.dateKey <= selectedDate) {
        classesAdded += day.entries.length;
      }
    }

    const futureTotal = currentTotal + classesAdded;
    const futureAttended = currentAttended + classesAdded;
    const futurePercentage = futureTotal > 0 ? (futureAttended / futureTotal) * 100 : 0;

    setResult({ percentage: futurePercentage, classesAdded });
  };

  return (
    <div
      className="surface-card rise-in"
      style={{
        display: "grid",
        gap: 12,
        padding: "18px 20px",
        borderRadius: 22,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        background: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)",
      }}
    >
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#4a044e" }}>
          📈 Redemption Arc
        </h2>
        <p style={{ color: "#701a75", fontSize: 14, margin: "4px 0 0" }}>
          Aaj se pakka padhunga mode 😇
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(134, 25, 143, 0.3)",
            fontSize: 14,
            outline: "none",
            background: "#fff",
            color: "#4a044e",
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={handleCalculate}
          style={{
            padding: "8.5px 18px",
            borderRadius: 10,
            border: "none",
            background: "#86198f",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#701a75")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#86198f")}
        >
          Calculate
        </button>
      </div>

      {result !== null && (
        <div
          style={{
            marginTop: 4,
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px dashed rgba(134, 25, 143, 0.4)",
            color: "#4a044e",
            fontSize: 15,
          }}
        >
          If you attend all classes till {new Date(selectedDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          → <strong style={{ fontSize: 18 }}>{result.percentage.toFixed(1)}%</strong>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            (+{result.classesAdded} classes counted)
          </div>
        </div>
      )}
    </div>
  );
}
