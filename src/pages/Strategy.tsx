import React, { useMemo, useState } from "react";
import {
  ProgressBar,
  Metric,
  RecoveryNote,
  secondaryButtonStyle,
} from "../App";
import { Panel, EmptyMessage } from "../components/UI";
import { RedemptionArc } from "../components/Attendance/RedemptionArc";
import type {
  OverallSummary,
  BunkableDay,
  SubjectSummary,
  WholeDayPlanSummary,
} from "../App";
import type { DayStreakRecord, SubjectAbsencesByDate } from "../utils/streak";

function formatDateKeyLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type LeaveRescueIntensity = "high" | "medium" | "low";

type LeaveRescueDay = {
  dateKey: string;
  label: string;
  total: number;
  attended: number;
  missed: number;
  intensity: LeaveRescueIntensity;
};

type LeaveRescueImpactSubject = {
  id: string;
  title: string;
  courseCode: string;
  componentName: string;
  oldPercentage: number;
  newPercentage: number;
  total: number;
  oldPresent: number;
  newPresent: number;
  addedPresent: number;
  wasRisky: boolean;
  crossesThreshold: boolean;
  stillRisky: boolean;
};

type LeaveRescueImpactSummary = {
  oldPercentage: number;
  newPercentage: number;
  oldPresent: number;
  newPresent: number;
  total: number;
  addedPresent: number;
  impactedSubjects: LeaveRescueImpactSubject[];
  unchangedSubjectsCount: number;
  crossesThresholdCount: number;
  stillRiskyCount: number;
};

function getLeaveRescueIntensity(missed: number): LeaveRescueIntensity {
  if (missed >= 4) {
    return "high";
  }

  if (missed >= 2) {
    return "medium";
  }

  return "low";
}

function getLeaveRescueTheme(intensity: LeaveRescueIntensity) {
  if (intensity === "high") {
    return {
      icon: "🔥",
      label: "High",
      color: "#9a3412",
      border: "1px solid rgba(251, 146, 60, 0.35)",
      background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    };
  }

  if (intensity === "medium") {
    return {
      icon: "⚠️",
      label: "Medium",
      color: "#92400e",
      border: "1px solid rgba(251, 191, 36, 0.35)",
      background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    };
  }

  return {
    icon: "🟢",
    label: "Low",
    color: "#166534",
    border: "1px solid rgba(74, 222, 128, 0.35)",
    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
  };
}

function getAttendanceSubjectKey(
  subject: Pick<SubjectSummary, "courseId" | "courseComponentId">,
): string {
  return `${subject.courseId}:${subject.courseComponentId}`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getLeaveRescueImpactTheme(subject: LeaveRescueImpactSubject) {
  if (subject.crossesThreshold) {
    return {
      icon: "✅",
      label: "Safe",
      color: "#166534",
      border: "1px solid rgba(74, 222, 128, 0.35)",
      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    };
  }

  if (subject.stillRisky) {
    return {
      icon: "⚠️",
      label: "Still risky",
      color: "#92400e",
      border: "1px solid rgba(251, 191, 36, 0.35)",
      background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    };
  }

  return {
    icon: "📈",
    label: "Improved",
    color: "#1d4ed8",
    border: "1px solid rgba(96, 165, 250, 0.35)",
    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
  };
}

export interface StrategyData {
  bunkableDays: BunkableDay[];
  selectedBunkDates: Set<string>;
  selectedBunkCutoffDateKey: string | null;
  overallWholeDayPlan: WholeDayPlanSummary | null;
  wholeDayPlanSummaries: WholeDayPlanSummary[];
  overallSummary: OverallSummary | null;
  subjectSummaries: SubjectSummary[];
  streakDayData: Record<string, DayStreakRecord>;
  streakSubjectAbsencesByDate: SubjectAbsencesByDate;
  streakLoading: boolean;
  streakIsReliable: boolean;
}

export interface StrategyHandlers {
  handleWholeDayToggle: (dateKey: string) => void;
}

export function Strategy({ data, handlers }: { data: StrategyData; handlers: StrategyHandlers }) {
  const FUTURE_WEEKS_TO_FETCH = 12;
  const [selectedLeaveRescueDates, setSelectedLeaveRescueDates] = useState<Set<string>>(new Set());
  const leaveRescueDays = useMemo<LeaveRescueDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(start.getDate() - 28);

    const todayKey = formatIsoDate(today);
    const startKey = formatIsoDate(start);

    return Object.values(data.streakDayData)
      .filter((day) => day.total > 0 && day.dateKey >= startKey && day.dateKey < todayKey)
      .map((day) => {
        const missed = Math.max(0, day.total - day.attended);

        return {
          dateKey: day.dateKey,
          label: formatDateKeyLabel(day.dateKey),
          total: day.total,
          attended: day.attended,
          missed,
          intensity: getLeaveRescueIntensity(missed),
        };
      })
      .filter((day) => day.missed > 0)
      .sort(
        (left, right) =>
          right.missed - left.missed ||
          right.total - left.total ||
          right.dateKey.localeCompare(left.dateKey),
      );
  }, [data.streakDayData]);
  const selectedLeaveRescueDays = useMemo(
    () => leaveRescueDays.filter((day) => selectedLeaveRescueDates.has(day.dateKey)),
    [leaveRescueDays, selectedLeaveRescueDates],
  );
  const featuredLeaveRescueDays = leaveRescueDays.slice(0, 3);
  const extraLeaveRescueDays = leaveRescueDays.slice(3);
  const leaveRescueImpact = useMemo<LeaveRescueImpactSummary | null>(() => {
    if (!data.overallSummary || data.subjectSummaries.length === 0 || selectedLeaveRescueDays.length === 0) {
      return null;
    }

    let addedPresent = 0;
    const subjectImpact = data.subjectSummaries.map((subject) => {
      const subjectKey = getAttendanceSubjectKey(subject);
      const addedPresentForSubject = selectedLeaveRescueDays.reduce(
        (sum, day) =>
          sum + (data.streakSubjectAbsencesByDate[day.dateKey]?.[subjectKey] ?? 0),
        0,
      );
      const newPresent = subject.present + addedPresentForSubject;
      const newPercentage = subject.total > 0 ? (newPresent / subject.total) * 100 : 0;
      const wasRisky = subject.percentage < 75;
      const crossesThreshold = wasRisky && newPercentage >= 75;
      const stillRisky = wasRisky && newPercentage < 75;

      addedPresent += addedPresentForSubject;

      return {
        id: subject.id,
        title: subject.title,
        courseCode: subject.courseCode,
        componentName: subject.componentName,
        oldPercentage: subject.percentage,
        newPercentage,
        total: subject.total,
        oldPresent: subject.present,
        newPresent,
        addedPresent: addedPresentForSubject,
        wasRisky,
        crossesThreshold,
        stillRisky,
      };
    });

    const impactedSubjects = subjectImpact
      .filter((subject) => subject.addedPresent > 0)
      .sort((left, right) => {
        const leftRank = left.crossesThreshold ? 0 : left.stillRisky ? 1 : 2;
        const rightRank = right.crossesThreshold ? 0 : right.stillRisky ? 1 : 2;

        return (
          leftRank - rightRank ||
          right.addedPresent - left.addedPresent ||
          right.newPercentage - left.newPercentage ||
          left.title.localeCompare(right.title)
        );
      });

    const oldPresent = data.overallSummary.present;
    const total = data.overallSummary.total;
    const newPresent = oldPresent + addedPresent;

    return {
      oldPercentage: data.overallSummary.percentage,
      newPercentage: total > 0 ? (newPresent / total) * 100 : 0,
      oldPresent,
      newPresent,
      total,
      addedPresent,
      impactedSubjects,
      unchangedSubjectsCount: data.subjectSummaries.length - impactedSubjects.length,
      crossesThresholdCount: impactedSubjects.filter((subject) => subject.crossesThreshold).length,
      stillRiskyCount: impactedSubjects.filter((subject) => subject.stillRisky).length,
    };
  }, [
    data.overallSummary,
    data.streakSubjectAbsencesByDate,
    data.subjectSummaries,
    selectedLeaveRescueDays,
  ]);

  function handleLeaveRescueToggle(dateKey: string) {
    setSelectedLeaveRescueDates((previous) => {
      const next = new Set(previous);

      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }

      return next;
    });
  }

  function clearLeaveRescueSelection() {
    setSelectedLeaveRescueDates(new Set());
  }

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
        <Panel
          title="Leave Rescue"
          subtitle="Find the best days to fix your attendance. Uses the last 4 weeks of already-fetched attendance history."
        >
          {data.streakLoading ? (
            <EmptyMessage message="Loading last 4 weeks of attendance..." />
          ) : !data.streakIsReliable ? (
            <EmptyMessage message="Recent attendance history is not available right now." />
          ) : leaveRescueDays.length === 0 ? (
            <EmptyMessage message="No missed classes in last 4 weeks 🎉" />
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "#5f6f69", fontSize: 14, maxWidth: "72ch" }}>
                  Best days are ranked by missed classes from the existing streak dataset. No new
                  requests, no recomputation of attendance history.
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: "#f8fafc",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    color: "#334155",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {leaveRescueDays.length} day{leaveRescueDays.length === 1 ? "" : "s"} found
                </div>
                {selectedLeaveRescueDays.length > 0 && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "#dbeafe",
                      border: "1px solid rgba(37, 99, 235, 0.18)",
                      color: "#1d4ed8",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {selectedLeaveRescueDays.length} selected
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                {featuredLeaveRescueDays.map((day) => {
                  const theme = getLeaveRescueTheme(day.intensity);
                  const isSelected = selectedLeaveRescueDates.has(day.dateKey);

                  return (
                    <button
                      type="button"
                      className="surface-card rise-in"
                      key={`leave-rescue-featured-${day.dateKey}`}
                      onClick={() => handleLeaveRescueToggle(day.dateKey)}
                      style={{
                        display: "grid",
                        gap: 10,
                        padding: 18,
                        borderRadius: 18,
                        border: isSelected ? "2px solid #2563eb" : theme.border,
                        background: isSelected
                          ? "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)"
                          : theme.background,
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        font: "inherit",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ fontSize: 18 }}>{day.label}</strong>
                          <span style={{ color: "#475569", fontSize: 13 }}>{day.dateKey}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
                          {isSelected && (
                            <span
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: "#2563eb",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              Selected
                            </span>
                          )}
                          <span
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "rgba(255, 255, 255, 0.72)",
                              color: theme.color,
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {theme.icon} {theme.label}
                          </span>
                        </div>
                      </div>

                      <div style={{ color: "#0f172a", fontSize: 24, fontWeight: 800 }}>
                        Missed {day.missed} / {day.total}
                      </div>
                      <div style={{ color: "#475569", fontSize: 14 }}>
                        Attended {day.attended} class{day.attended === 1 ? "" : "es"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {extraLeaveRescueDays.length > 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>More days worth checking</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {extraLeaveRescueDays.map((day) => {
                      const theme = getLeaveRescueTheme(day.intensity);
                      const isSelected = selectedLeaveRescueDates.has(day.dateKey);

                      return (
                        <button
                          type="button"
                          className="surface-card"
                          key={`leave-rescue-extra-${day.dateKey}`}
                          onClick={() => handleLeaveRescueToggle(day.dateKey)}
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                            padding: 14,
                            borderRadius: 16,
                            border: isSelected
                              ? "2px solid #2563eb"
                              : "1px solid rgba(15, 23, 42, 0.08)",
                            background: isSelected ? "#eff6ff" : "#fff",
                            flexWrap: "wrap",
                            width: "100%",
                            textAlign: "left",
                            cursor: "pointer",
                            font: "inherit",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gap: 4,
                              flex: "0 0 auto",
                              minWidth: "fit-content",
                            }}
                          >
                            <strong style={{ whiteSpace: "nowrap", wordBreak: "normal" }}>
                              {day.label}
                            </strong>
                            <span
                              style={{
                                color: "#64748b",
                                fontSize: 13,
                                whiteSpace: "nowrap",
                                wordBreak: "normal",
                              }}
                            >
                              {day.dateKey}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              justifyContent: "flex-end",
                              color: "#334155",
                              fontWeight: 700,
                              flexWrap: "wrap",
                              marginLeft: "auto",
                            }}
                          >
                            {isSelected && (
                              <span style={{ color: "#1d4ed8" }}>
                                ✓ Selected
                              </span>
                            )}
                            <span style={{ color: theme.color }}>
                              {theme.icon} {theme.label}
                            </span>
                            <span>
                              Missed {day.missed} / {day.total}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                className="surface-card surface-card--highlight"
                style={{
                  display: "grid",
                  gap: 16,
                  padding: 18,
                  borderRadius: 18,
                  border: "1px solid rgba(59, 130, 246, 0.18)",
                  background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>Impact if medical applied</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      {selectedLeaveRescueDays.length === 0
                        ? "Select one or more days to preview the attendance lift."
                        : selectedLeaveRescueDays.map((day) => day.label).join(", ")}
                    </div>
                  </div>
                  {selectedLeaveRescueDays.length > 0 && (
                    <button
                      type="button"
                      onClick={clearLeaveRescueSelection}
                      style={{
                        ...secondaryButtonStyle,
                        padding: "8px 14px",
                        marginLeft: "auto",
                      }}
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                {selectedLeaveRescueDays.length === 0 ? (
                  <EmptyMessage message="Select one or more days to simulate medical impact." />
                ) : !leaveRescueImpact || !data.overallSummary ? (
                  <EmptyMessage message="Impact preview is not available right now." />
                ) : leaveRescueImpact.addedPresent === 0 ? (
                  <EmptyMessage message="No ABSENT classes were found on the selected days." />
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>📊 Overall Improvement</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <Metric
                          label="Overall"
                          value={`${formatPercentage(leaveRescueImpact.oldPercentage)} -> ${formatPercentage(leaveRescueImpact.newPercentage)}`}
                        />
                        <Metric
                          label="Recovered Classes"
                          value={String(leaveRescueImpact.addedPresent)}
                        />
                        <Metric
                          label="Present Count"
                          value={`${leaveRescueImpact.oldPresent} -> ${leaveRescueImpact.newPresent}`}
                        />
                        <Metric
                          label="Subjects Safe"
                          value={String(leaveRescueImpact.crossesThresholdCount)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>📘 Subject Breakdown</div>
                        <span style={{ color: "#64748b", fontSize: 13 }}>
                          {leaveRescueImpact.unchangedSubjectsCount} unchanged
                        </span>
                        {leaveRescueImpact.stillRiskyCount > 0 && (
                          <span
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "#fef3c7",
                              color: "#92400e",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {leaveRescueImpact.stillRiskyCount} still risky
                          </span>
                        )}
                      </div>

                      {leaveRescueImpact.impactedSubjects.length === 0 ? (
                        <EmptyMessage message="No subject-level changes were found for the selected days." />
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {leaveRescueImpact.impactedSubjects.map((subject) => {
                            const impactTheme = getLeaveRescueImpactTheme(subject);

                            return (
                              <div
                                className="surface-card rise-in"
                                key={`leave-rescue-impact-${subject.id}`}
                                style={{
                                  display: "grid",
                                  gap: 10,
                                  padding: 16,
                                  borderRadius: 18,
                                  border: impactTheme.border,
                                  background: impactTheme.background,
                                }}
                              >
                                <div style={{ display: "grid", gap: 4 }}>
                                  <div style={{ fontWeight: 700 }}>{subject.title}</div>
                                  <div style={{ color: "#64748b", fontSize: 13 }}>
                                    {subject.courseCode} - {subject.componentName}
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span style={{ color: "#0f172a", fontSize: 20, fontWeight: 800 }}>
                                    {formatPercentage(subject.oldPercentage)}
                                    {" -> "}
                                    {formatPercentage(subject.newPercentage)}
                                  </span>
                                  <span
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: 999,
                                      background: "rgba(255, 255, 255, 0.72)",
                                      color: impactTheme.color,
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    {impactTheme.icon} {impactTheme.label}
                                  </span>
                                </div>

                                <div style={{ color: "#475569", fontSize: 14 }}>
                                  Present {subject.oldPresent}/{subject.total}
                                  {" -> "}
                                  {subject.newPresent}/{subject.total}
                                </div>
                                <div style={{ color: impactTheme.color, fontSize: 13, fontWeight: 700 }}>
                                  +{subject.addedPresent} class{subject.addedPresent === 1 ? "" : "es"} recovered
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <RedemptionArc data={data.overallSummary} schedule={data.bunkableDays} />
      </section>
    </>
  );
}
