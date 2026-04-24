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
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          Attendance recovery
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "4px 0 0" }}>
          See where your attendance lands if you attend every class until a selected date.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="standard-input"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            fontSize: 14,
            outline: "none",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontFamily: "inherit",
          }}
        />
        <button
          className="action-button action-button--primary"
          type="button"
          onClick={handleCalculate}
          style={{
            padding: "8.5px 18px",
            borderRadius: 10,
            border: "none",
            background: "var(--primary)",
            color: "var(--text-on-primary)",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            transition: "all 0.2s",
          }}
        >
          Preview
        </button>
      </div>

      {result !== null && (
        <div
          style={{
            marginTop: 4,
            padding: "14px 16px",
            borderRadius: 12,
            background: "var(--bg-card-subtle)",
            border: "1px dashed var(--border-strong)",
            color: "var(--text-primary)",
            fontSize: 15,
          }}
        >
          If you attend every class until {new Date(selectedDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          your attendance reaches <strong style={{ fontSize: 18 }}>{result.percentage.toFixed(1)}%</strong>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, color: "var(--text-muted)" }}>
            +{result.classesAdded} classes added
          </div>
        </div>
      )}
    </div>
  );
}
