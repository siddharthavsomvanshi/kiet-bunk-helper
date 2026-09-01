import React, { useMemo, useState } from "react";
import { Panel, EmptyMessage } from "../components/UI";
import type {
  ReadOnlyAttendanceSnapshot,
  MultiverseScenario,
  BunkTypeOption,
} from "../utils/multiverse";
import {
  calculateMultiverseSimulation,
  INITIAL_MULTIVERSE_SCENARIO,
  getScheduleDateKey,
  getScheduleEntryKey,
  formatDateKeyLabel,
} from "../utils/multiverse";
import { formatScheduleDay, formatScheduleTime } from "../utils/date";

export function MultiversePage({ data }: { data: ReadOnlyAttendanceSnapshot }) {
  const [scenario, setScenario] = useState<MultiverseScenario>(INITIAL_MULTIVERSE_SCENARIO);
  const [selectedClassDateKey, setSelectedClassDateKey] = useState<string>("");

  const simulationResult = useMemo(() => {
    return calculateMultiverseSimulation(data, scenario);
  }, [data, scenario]);

  const hasData = Boolean(data.attendance && data.subjectSummaries.length > 0);

  // Group future classes by date for the "Selected classes" mode
  const futureClassesByDate = useMemo(() => {
    const map = new Map<string, typeof data.futureClasses>();
    for (const entry of data.futureClasses) {
      const dateKey = getScheduleDateKey(entry);
      const existing = map.get(dateKey) ?? [];
      existing.push(entry);
      map.set(dateKey, existing);
    }
    return map;
  }, [data.futureClasses]);

  const sortedFutureDateKeys = useMemo(() => {
    return Array.from(futureClassesByDate.keys()).sort();
  }, [futureClassesByDate]);

  // Set default selectedClassDateKey if empty
  const activeClassDateKey = selectedClassDateKey || sortedFutureDateKeys[0] || "";

  const classesOnSelectedDate = useMemo(() => {
    if (!activeClassDateKey) return [];
    return futureClassesByDate.get(activeClassDateKey) ?? [];
  }, [futureClassesByDate, activeClassDateKey]);

  function handleResetScenario() {
    setScenario(INITIAL_MULTIVERSE_SCENARIO);
  }

  function toggleBunkDate(dateKey: string) {
    setScenario((prev) => {
      const current = new Set(prev.selectedBunkDates);
      if (current.has(dateKey)) {
        current.delete(dateKey);
      } else {
        current.add(dateKey);
      }
      return {
        ...prev,
        selectedBunkDates: Array.from(current),
      };
    });
  }

  function toggleBunkClass(entryKey: string) {
    setScenario((prev) => {
      const current = new Set(prev.selectedBunkClassKeys);
      if (current.has(entryKey)) {
        current.delete(entryKey);
      } else {
        current.add(entryKey);
      }
      return {
        ...prev,
        selectedBunkClassKeys: Array.from(current),
      };
    });
  }

  function removeBunkItem(itemKey: string, type: BunkTypeOption) {
    setScenario((prev) => {
      if (type === "entire_day") {
        return {
          ...prev,
          selectedBunkDates: prev.selectedBunkDates.filter((k) => k !== itemKey),
        };
      }
      return {
        ...prev,
        selectedBunkClassKeys: prev.selectedBunkClassKeys.filter((k) => k !== itemKey),
      };
    });
  }

  if (!hasData) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <Panel
          title="Attendance Multiverse"
          subtitle="What if you did things differently?"
        >
          <EmptyMessage message="Connect KIET or load attendance to start simulating multiverse scenarios." />
        </Panel>
      </div>
    );
  }

  const { overall, subjects, explanation } = simulationResult;

  return (
    <div style={{ display: "grid", gap: 24, paddingBottom: 40 }}>
      {/* Top Header & Sandbox Banner */}
      <section
        className="premium-panel rise-in"
        style={{
          padding: "24px 28px",
          borderRadius: 28,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>
                Attendance Multiverse
              </h1>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Sandbox
              </span>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 16 }}>
              What if you did things differently?
            </p>
          </div>

          <button
            type="button"
            className="action-button action-button--secondary"
            onClick={handleResetScenario}
            style={{
              padding: "10px 18px",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--bg-card-subtle)",
              color: "var(--text-primary)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Clear scenario
          </button>
        </div>

        {/* Disclaimer Banner */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 16,
            background: "var(--info-soft)",
            border: "1px solid rgba(37, 99, 235, 0.2)",
            color: "var(--info)",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🔒</span>
          <span>Simulation only — your real attendance will not change.</span>
        </div>
      </section>

      {/* Progressive Disclosure Selector */}
      <Panel
        title="WHAT DO YOU WANT TO SIMULATE?"
        subtitle="Select any combination of hypothetical events below."
      >
        <div style={{ display: "grid", gap: 16 }}>
          {/* Checkboxes */}
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderRadius: 18,
                background: scenario.enableBunking ? "var(--primary-soft)" : "var(--bg-card-subtle)",
                border: `1.5px solid ${scenario.enableBunking ? "var(--primary)" : "var(--border)"}`,
                cursor: "pointer",
                fontWeight: 600,
                color: "var(--text-primary)",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={scenario.enableBunking}
                onChange={(e) =>
                  setScenario((prev) => ({ ...prev, enableBunking: e.target.checked }))
                }
                style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
              />
              <span>🏖️ Bunk future classes</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderRadius: 18,
                background: scenario.enableMedicalLeave ? "var(--primary-soft)" : "var(--bg-card-subtle)",
                border: `1.5px solid ${scenario.enableMedicalLeave ? "var(--primary)" : "var(--border)"}`,
                cursor: "pointer",
                fontWeight: 600,
                color: "var(--text-primary)",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={scenario.enableMedicalLeave}
                onChange={(e) =>
                  setScenario((prev) => ({ ...prev, enableMedicalLeave: e.target.checked }))
                }
                style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
              />
              <span>🚑 Medical leave</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderRadius: 18,
                background: scenario.enableTargetDate ? "var(--primary-soft)" : "var(--bg-card-subtle)",
                border: `1.5px solid ${scenario.enableTargetDate ? "var(--primary)" : "var(--border)"}`,
                cursor: "pointer",
                fontWeight: 600,
                color: "var(--text-primary)",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={scenario.enableTargetDate}
                onChange={(e) =>
                  setScenario((prev) => ({ ...prev, enableTargetDate: e.target.checked }))
                }
                style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
              />
              <span>📅 Check attendance after a specific date</span>
            </label>
          </div>

          {/* Section 1: Bunk Future Classes Controls */}
          {scenario.enableBunking && (
            <div
              style={{
                padding: 20,
                borderRadius: 20,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
                Bunk type:
              </div>

              <div style={{ display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bunkType"
                    value="entire_day"
                    checked={scenario.bunkType === "entire_day"}
                    onChange={() => setScenario((prev) => ({ ...prev, bunkType: "entire_day" }))}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span>Entire day</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bunkType"
                    value="selected_classes"
                    checked={scenario.bunkType === "selected_classes"}
                    onChange={() => setScenario((prev) => ({ ...prev, bunkType: "selected_classes" }))}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span>Selected classes</span>
                </label>
              </div>

              {scenario.bunkType === "entire_day" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
                    Select future dates to hypothetically bunk entirely:
                  </div>
                  {data.bunkableDays.length === 0 ? (
                    <EmptyMessage message="No future dates available in schedule." />
                  ) : (
                    <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", paddingRight: 6 }}>
                      {data.bunkableDays.map((day) => {
                        const isSelected = scenario.selectedBunkDates.includes(day.dateKey);
                        return (
                          <label
                            key={day.dateKey}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              borderRadius: 12,
                              background: isSelected ? "var(--primary-soft)" : "var(--bg-card)",
                              border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                              cursor: "pointer",
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{day.label}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                {day.entries.length} class{day.entries.length === 1 ? "" : "es"}
                              </span>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleBunkDate(day.dateKey)}
                                style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                              />
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
                      1. Select a future date:
                    </label>
                    <select
                      value={activeClassDateKey}
                      onChange={(e) => setSelectedClassDateKey(e.target.value)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: 15,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    >
                      {sortedFutureDateKeys.length === 0 ? (
                        <option value="">No future dates</option>
                      ) : (
                        sortedFutureDateKeys.map((dateKey) => (
                          <option key={dateKey} value={dateKey}>
                            {formatDateKeyLabel(dateKey)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
                      2. Select individual classes to hypothetically bunk:
                    </label>

                    {classesOnSelectedDate.length === 0 ? (
                      <EmptyMessage message="No classes scheduled on this date." />
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {classesOnSelectedDate.map((entry) => {
                          const entryKey = getScheduleEntryKey(entry);
                          const isChecked = scenario.selectedBunkClassKeys.includes(entryKey);
                          return (
                            <label
                              key={entryKey}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 16px",
                                borderRadius: 14,
                                background: isChecked ? "var(--primary-soft)" : "var(--bg-card)",
                                border: `1px solid ${isChecked ? "var(--primary)" : "var(--border)"}`,
                                cursor: "pointer",
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                                  {entry.courseName || entry.title}
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                  {formatScheduleTime(entry.start)} - {formatScheduleTime(entry.end)} | {entry.courseCompName || "Class"}
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleBunkClass(entryKey)}
                                style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Active Selected Bunks Summary Chips */}
              {explanation.activeBunks.length > 0 && (
                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
                    Selected hypothetical bunks ({explanation.activeBunks.length}):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {explanation.activeBunks.map((item) => (
                      <span
                        key={item.key}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          background: "var(--danger-soft)",
                          color: "var(--danger)",
                          fontSize: 13,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {item.label}
                        <button
                          type="button"
                          onClick={() => removeBunkItem(item.key, item.type)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--danger)",
                            fontWeight: 800,
                            cursor: "pointer",
                            padding: 0,
                            fontSize: 14,
                            lineHeight: 1,
                          }}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Medical Leave Controls */}
          {scenario.enableMedicalLeave && (
            <div
              style={{
                padding: 20,
                borderRadius: 20,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
                Hypothetical Medical / Duty Leave
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
                Select a date range where past absences occurred to simulate approved medical leave.
              </p>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 160 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                    From date:
                  </label>
                  <input
                    type="date"
                    value={scenario.medicalStartDate}
                    onChange={(e) =>
                      setScenario((prev) => ({ ...prev, medicalStartDate: e.target.value }))
                    }
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 160 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                    To date:
                  </label>
                  <input
                    type="date"
                    value={scenario.medicalEndDate}
                    onChange={(e) =>
                      setScenario((prev) => ({ ...prev, medicalEndDate: e.target.value }))
                    }
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              {explanation.activeMedicalLeave && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--success-soft)",
                    color: "var(--success)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  +{explanation.activeMedicalLeave.addedPresent} missed period{explanation.activeMedicalLeave.addedPresent === 1 ? "" : "s"} simulated as approved leave.
                </div>
              )}
            </div>
          )}

          {/* Section 3: Target Date Controls */}
          {scenario.enableTargetDate && (
            <div
              style={{
                padding: 20,
                borderRadius: 20,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
                Target Date Horizon
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
                Explicitly check projected attendance up to a specific date.
              </p>

              <div style={{ display: "grid", gap: 6, maxWidth: 280 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                  Check attendance on:
                </label>
                <input
                  type="date"
                  value={scenario.explicitTargetDate}
                  onChange={(e) =>
                    setScenario((prev) => ({ ...prev, explicitTargetDate: e.target.value }))
                  }
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Simulation Result Explanation Card */}
      <section
        className="premium-panel rise-in"
        style={{
          padding: 20,
          borderRadius: 24,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Simulation Parameters & Endpoint
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14, color: "var(--text-primary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Result date:</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary)", fontWeight: 700 }}>
              {explanation.resultDateLabel}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              ({explanation.isAutomaticDate ? "Automatic" : "Explicit Target"})
            </span>
          </div>

          {explanation.activeMedicalLeave && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Medical leave:</span>
              <span>{explanation.activeMedicalLeave.startDate} → {explanation.activeMedicalLeave.endDate}</span>
            </div>
          )}

          {explanation.activeBunks.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Bunks:</span>
              <span>{explanation.activeBunks.length} hypothetical bunk item{explanation.activeBunks.length === 1 ? "" : "s"}</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            <span>ℹ️</span>
            <span>Assumption: All other future classes up to {explanation.resultDateLabel} are treated as attended.</span>
          </div>
        </div>
      </section>

      {/* Overall Attendance Comparison Card */}
      <section
        className="premium-panel rise-in"
        style={{
          padding: "24px 28px",
          borderRadius: 28,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          display: "grid",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
          Overall Simulation Summary
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {/* Current Overall */}
          <div
            style={{
              padding: 18,
              borderRadius: 20,
              background: "var(--bg-card-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>
              CURRENT OVERALL
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>
              {overall.realPercentage.toFixed(1)}%
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {overall.realPresent} / {overall.realTotal} periods
            </div>
          </div>

          {/* Simulated Overall */}
          <div
            style={{
              padding: 18,
              borderRadius: 20,
              background: overall.isOverallSafe ? "var(--success-soft)" : "var(--danger-soft)",
              border: `1px solid ${overall.isOverallSafe ? "var(--success)" : "var(--danger)"}`,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: overall.isOverallSafe ? "var(--success)" : "var(--danger)",
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              SIMULATED OVERALL
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: overall.isOverallSafe ? "var(--success)" : "var(--danger)",
              }}
            >
              {overall.simulatedPercentage.toFixed(1)}%
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
              {overall.simulatedPresent} / {overall.simulatedTotal} periods
            </div>
          </div>

          {/* Net Change */}
          <div
            style={{
              padding: 18,
              borderRadius: 20,
              background: "var(--bg-card-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>
              NET CHANGE
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color:
                  overall.deltaPercentagePoints > 0
                    ? "var(--success)"
                    : overall.deltaPercentagePoints < 0
                    ? "var(--danger)"
                    : "var(--text-primary)",
              }}
            >
              {overall.deltaPercentagePoints > 0 ? "+" : ""}
              {overall.deltaPercentagePoints.toFixed(1)} pts
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Impact on overall %
            </div>
          </div>
        </div>

        {/* Interpretation sentence */}
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 16,
            background: "var(--bg-card-subtle)",
            border: "1px solid var(--border)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1.5,
          }}
        >
          Your simulated overall attendance would be <strong>{overall.simulatedPercentage.toFixed(1)}%</strong>.{" "}
          {overall.belowThresholdSubjectCount > 0 ? (
            <span style={{ color: "var(--danger)" }}>
              {overall.belowThresholdSubjectCount} subject{overall.belowThresholdSubjectCount === 1 ? "" : "s"} would remain below 75%.
            </span>
          ) : (
            <span style={{ color: "var(--success)" }}>
              All {overall.totalSubjectCount} subjects would be safe at or above 75%!
            </span>
          )}
        </div>
      </section>

      {/* Subject-Wise Results */}
      <Panel
        title="SUBJECT-WISE SIMULATION RESULTS"
        subtitle="Individual subject breakdown under the simulated scenario."
      >
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {subjects.map((subject) => {
            const isGain = subject.deltaPercentage > 0;
            const isLoss = subject.deltaPercentage < 0;

            return (
              <div
                key={subject.id}
                style={{
                  padding: 20,
                  borderRadius: 22,
                  background: "var(--bg-card)",
                  border: `1.5px solid ${subject.isSafe ? "var(--border)" : "var(--danger)"}`,
                  display: "grid",
                  gap: 14,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Subject Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
                      {subject.title}
                    </h3>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {subject.courseCode} • {subject.componentName}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 700,
                      background: subject.isSafe ? "var(--success-soft)" : "var(--danger-soft)",
                      color: subject.isSafe ? "var(--success)" : "var(--danger)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {subject.isSafe ? "🟢 Safe" : "🔴 Below 75%"}
                  </span>
                </div>

                {/* Percentage Transition */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 18, color: "var(--text-muted)", textDecoration: "line-through" }}>
                    {subject.realPercentage.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 24, color: "var(--text-muted)" }}>→</span>
                  <span style={{ fontSize: 26, fontWeight: 800, color: subject.isSafe ? "var(--text-primary)" : "var(--danger)" }}>
                    {subject.simulatedPercentage.toFixed(1)}%
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: isGain ? "var(--success)" : isLoss ? "var(--danger)" : "var(--text-muted)",
                      marginLeft: "auto",
                    }}
                  >
                    {isGain ? "+" : ""}
                    {subject.deltaPercentage.toFixed(1)}%
                  </span>
                </div>

                {/* Breakdown Details */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: "var(--bg-card-subtle)",
                    fontSize: 13,
                    display: "grid",
                    gap: 6,
                    color: "var(--text-secondary)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Periods present/total:</span>
                    <strong style={{ color: "var(--text-primary)" }}>
                      {subject.simulatedPresent} / {subject.simulatedTotal}
                    </strong>
                  </div>

                  {subject.medicalLeaveAddedPresent > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)" }}>
                      <span>Medical leave credit:</span>
                      <strong>+{subject.medicalLeaveAddedPresent} present</strong>
                    </div>
                  )}

                  {subject.futureClassesBunkedCount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)" }}>
                      <span>Hypothetical bunks:</span>
                      <strong>{subject.futureClassesBunkedCount} class{subject.futureClassesBunkedCount === 1 ? "" : "es"}</strong>
                    </div>
                  )}

                  {subject.futureClassesAttendedCount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Future classes attended:</span>
                      <strong>+{subject.futureClassesAttendedCount} class{subject.futureClassesAttendedCount === 1 ? "" : "es"}</strong>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
                    <span>Status metric:</span>
                    {subject.isSafe ? (
                      <span style={{ color: "var(--success)", fontWeight: 700 }}>
                        {subject.simulatedSafeBunks} safe bunk{subject.simulatedSafeBunks === 1 ? "" : "s"} left
                      </span>
                    ) : (
                      <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                        Need {subject.simulatedClassesNeeded} consecutive class{subject.simulatedClassesNeeded === 1 ? "" : "es"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
