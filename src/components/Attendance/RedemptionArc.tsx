import { useState } from "react";
import type { ScheduleEntry } from "../../types/kiet";

interface RedemptionArcProps {
  subjectSummaries: { present: number; total: number }[];
  upcomingClasses: ScheduleEntry[];
}

export function RedemptionArc({ subjectSummaries, upcomingClasses }: RedemptionArcProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [result, setResult] = useState<{ percentage: number; classesAdded: number } | null>(null);

  const handleCalculate = () => {
    if (!selectedDate) {
      setResult(null);
      return;
    }

    const cutoffDate = new Date(selectedDate);
    // Include all classes on the selected date by setting time to end of day
    cutoffDate.setHours(23, 59, 59, 999);

    let currentAttended = 0;
    let currentTotal = 0;

    // 1. Sum current attendance
    for (const subject of subjectSummaries) {
      currentAttended += subject.present;
      currentTotal += subject.total;
    }

    // 2. Filter upcoming classes up to the selected date
    let upcomingClassesCount = 0;
    for (const entry of upcomingClasses) {
      if (entry.start) {
        const classDate = new Date(entry.start);
        if (classDate <= cutoffDate) {
          upcomingClassesCount += 1;
        }
      }
    }

    // 3. Compute the future percentage
    const futureTotal = currentTotal + upcomingClassesCount;
    const futureAttended = currentAttended + upcomingClassesCount;
    const futurePercentage = futureTotal > 0 ? (futureAttended / futureTotal) * 100 : 0;

    setResult({ percentage: futurePercentage, classesAdded: upcomingClassesCount });
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
