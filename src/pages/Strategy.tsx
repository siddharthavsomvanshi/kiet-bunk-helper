import React from "react";
import {
  Panel,
  EmptyMessage,
  ProgressBar,
  Metric,
  RecoveryNote,
  secondaryButtonStyle,
} from "../App";
import { RedemptionArc } from "../components/Attendance/RedemptionArc";
import type {
  OverallSummary,
  BunkableDay,
  WholeDayPlanSummary,
} from "../App";

function formatDateKeyLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

export interface StrategyData {
  bunkableDays: BunkableDay[];
  selectedBunkDates: Set<string>;
  selectedBunkCutoffDateKey: string | null;
  overallWholeDayPlan: WholeDayPlanSummary | null;
  wholeDayPlanSummaries: WholeDayPlanSummary[];
  overallSummary: OverallSummary | null;
}

export interface StrategyHandlers {
  handleWholeDayToggle: (dateKey: string) => void;
}

export function Strategy({ data, handlers }: { data: StrategyData; handlers: StrategyHandlers }) {
  const FUTURE_WEEKS_TO_FETCH = 12;

  return (
    <>
      <section style={{ display: "grid", gap: 14 }}>
        <Panel
          title="Whole Day Bunk Planner"
          subtitle={`Select one or more future dates. The dashboard will simulate bunking every class on those dates, then estimate how and when your attendance recovers within the next ${FUTURE_WEEKS_TO_FETCH} weeks.`}
        >
          <div className="planner-panel-shell" style={{ display: "grid", gap: 18 }}>
            <div
              className="planner-panel-toolbar"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: "#5f6f69", fontSize: 14, maxWidth: "72ch" }}>
                Pick dates on the left. The panel recalculates overall and subject-wise
                attendance after the last selected bunk day, then estimates recovery inside the
                loaded schedule horizon.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    padding: 14,
                    borderRadius: 16,
                    background: "#f8fafc",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <strong>Pick full days to bunk</strong>
                  <span style={{ color: "#64748b", fontSize: 14 }}>
                    Selected dates: {data.selectedBunkDates.size}
                    {data.selectedBunkCutoffDateKey
                      ? ` - simulated through ${formatDateKeyLabel(data.selectedBunkCutoffDateKey)}`
                      : ""}
                  </span>
                </div>

                {data.bunkableDays.length === 0 ? (
                  <EmptyMessage message="No future class dates are loaded yet." />
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      maxHeight: 620,
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {data.bunkableDays.map((day) => {
                      const isSelected = data.selectedBunkDates.has(day.dateKey);

                      return (
                        <label
                          className="surface-card"
                          key={day.dateKey}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "20px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "start",
                            padding: 14,
                            borderRadius: 16,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            background: isSelected ? "#dbeafe" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handlers.handleWholeDayToggle(day.dateKey)}
                            style={{ marginTop: 3 }}
                          />
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ fontWeight: 700 }}>{day.label}</div>
                            <div style={{ color: "#475569", fontSize: 14 }}>
                              {day.entries.length} class{day.entries.length === 1 ? "" : "es"}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 13 }}>
                              {day.entries
                                .slice(0, 3)
                                .map((entry) => entry.courseCode ?? entry.title)
                                .join(", ")}
                              {day.entries.length > 3 ? "..." : ""}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {data.selectedBunkDates.size === 0 || !data.overallWholeDayPlan ? (
                  <EmptyMessage message="Select at least one future date to simulate a whole-day bunk plan." />
                ) : (
                  <>
                    <div
                      className="surface-card surface-card--highlight rise-in"
                      style={{
                        display: "grid",
                        gap: 10,
                        padding: 18,
                        borderRadius: 18,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        background: "linear-gradient(135deg, #eef2ff 0%, #ecfeff 100%)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "baseline",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 18 }}>Overall after selected days</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>
                            This is your overall attendance after the last selected bunk date.
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                          <strong
                            style={{
                              color:
                                data.overallWholeDayPlan.currentPercentage >= 75
                                  ? "#166534"
                                  : "#b91c1c",
                            }}
                          >
                            Current: {data.overallWholeDayPlan.currentPercentage.toFixed(1)}%
                          </strong>
                          <span
                            style={{
                              color:
                                data.overallWholeDayPlan.afterSelectedPercentage >= 75
                                  ? "#166534"
                                  : "#b91c1c",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            After selected days:{" "}
                            {data.overallWholeDayPlan.afterSelectedPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <ProgressBar
                        label="Current overall"
                        percentage={data.overallWholeDayPlan.currentPercentage}
                        healthy={data.overallWholeDayPlan.currentPercentage >= 75}
                      />
                      <ProgressBar
                        label={`After selected days (${data.overallWholeDayPlan.selectedClassCount} missed)`}
                        percentage={data.overallWholeDayPlan.afterSelectedPercentage}
                        healthy={data.overallWholeDayPlan.afterSelectedPercentage >= 75}
                      />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: 10,
                          color: "#334155",
                          fontSize: 14,
                        }}
                      >
                        <Metric
                          label="After Selected"
                          value={`${data.overallWholeDayPlan.afterSelectedPresent}/${data.overallWholeDayPlan.afterSelectedTotal}`}
                        />
                        <Metric
                          label="Classes Missed"
                          value={String(data.overallWholeDayPlan.selectedClassCount)}
                        />
                        <Metric
                          label="Classes Attended"
                          value={String(data.overallWholeDayPlan.attendedClassCount)}
                        />
                      </div>

                      <RecoveryNote
                        recovery={data.overallWholeDayPlan.recovery}
                        cutoffDateKey={data.selectedBunkCutoffDateKey}
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {data.wholeDayPlanSummaries.map((subject) => (
                        <div
                          className="surface-card rise-in"
                          key={`whole-day-${subject.id}`}
                          style={{
                            display: "grid",
                            gap: 10,
                            padding: 16,
                            borderRadius: 18,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            background: "#fff",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "baseline",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700 }}>{subject.title}</div>
                              <div style={{ color: "#64748b", fontSize: 13 }}>
                                {subject.courseCode} - {subject.componentName}
                              </div>
                            </div>
                            <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                              <strong
                                style={{
                                  color: subject.currentPercentage >= 75 ? "#166534" : "#b91c1c",
                                }}
                              >
                                Current: {subject.currentPercentage.toFixed(1)}%
                              </strong>
                              <span
                                style={{
                                  color:
                                    subject.afterSelectedPercentage >= 75 ? "#166534" : "#b91c1c",
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}
                              >
                                After selected days: {subject.afterSelectedPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          <ProgressBar
                            label="Current"
                            percentage={subject.currentPercentage}
                            healthy={subject.currentPercentage >= 75}
                          />
                          <ProgressBar
                            label={`After selected days (${subject.selectedClassCount} missed)`}
                            percentage={subject.afterSelectedPercentage}
                            healthy={subject.afterSelectedPercentage >= 75}
                          />

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                              gap: 10,
                              color: "#334155",
                              fontSize: 14,
                            }}
                          >
                            <Metric
                              label="After Selected"
                              value={`${subject.afterSelectedPresent}/${subject.afterSelectedTotal}`}
                            />
                            <Metric
                              label="Classes Missed"
                              value={String(subject.selectedClassCount)}
                            />
                            <Metric
                              label="Classes Attended"
                              value={String(subject.attendedClassCount)}
                            />
                          </div>

                          <RecoveryNote
                            recovery={subject.recovery}
                            cutoffDateKey={data.selectedBunkCutoffDateKey}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <RedemptionArc data={data.overallSummary} schedule={data.bunkableDays} />
      </section>
    </>
  );
}
