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
      label: "High impact",
      color: "var(--danger)",
      borderClass: "border-l-danger",
      badgeBackground: "var(--danger-soft)",
    };
  }

  if (intensity === "medium") {
    return {
      label: "Medium impact",
      color: "var(--warning)",
      borderClass: "border-l-warning",
      badgeBackground: "var(--warning-soft)",
    };
  }

  return {
    label: "Low impact",
    color: "var(--success)",
    borderClass: "border-l-success",
    badgeBackground: "var(--success-soft)",
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
      label: "Now safe",
      color: "var(--success)",
      borderClass: "border-l-success",
      border: "1px solid var(--border)",
      background: "var(--bg-card)",
      badgeBackground: "var(--success-soft)",
    };
  }

  if (subject.stillRisky) {
    return {
      label: "Still risky",
      color: "var(--warning)",
      borderClass: "border-l-warning",
      border: "1px solid var(--border)",
      background: "var(--bg-card)",
      badgeBackground: "var(--warning-soft)",
    };
  }

  return {
    label: "Improved",
    color: "var(--primary)",
    borderClass: "border-l-primary",
    border: "1px solid var(--border)",
    background: "var(--bg-card)",
    badgeBackground: "var(--primary-soft)",
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
          subtitle="Plan your bunks without dropping below 75%."
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
              <div style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: "72ch" }}>
                Pick future dates and see the impact before you skip.
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
                    background: "var(--bg-card-subtle)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <strong>Pick bunk days</strong>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                    Selected: {data.selectedBunkDates.size}
                    {data.selectedBunkCutoffDateKey
                      ? ` - through ${formatDateKeyLabel(data.selectedBunkCutoffDateKey)}`
                      : ""}
                  </span>
                </div>

                {data.bunkableDays.length === 0 ? (
                  <EmptyMessage message="No upcoming class days yet." />
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
                          className="surface-card interactive-row"
                          key={day.dateKey}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "20px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "start",
                            padding: 14,
                            borderRadius: 16,
                            border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                            background: isSelected ? "var(--primary-soft)" : "var(--bg-card)",
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
                            <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                              {day.entries.length} class{day.entries.length === 1 ? "" : "es"}
                            </div>
                            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
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
                  <EmptyMessage message="Select a future date to start planning." />
                ) : (
                  <>
                    <div
                      className="standard-card rise-in border-l-primary"
                      style={{
                        display: "grid",
                        gap: 10,
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
                          <div style={{ fontWeight: 800, fontSize: 18 }}>Overall after bunks</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                            Your attendance after the last selected day.
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                          <strong
                            style={{
                              color:
                                data.overallWholeDayPlan.currentPercentage >= 75
                                  ? "var(--success)"
                                  : "var(--danger)",
                            }}
                          >
                            Current: {data.overallWholeDayPlan.currentPercentage.toFixed(1)}%
                          </strong>
                          <span
                            style={{
                              color:
                                data.overallWholeDayPlan.afterSelectedPercentage >= 75
                                  ? "var(--success)"
                                  : "var(--danger)",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            After bunks:{" "}
                            {data.overallWholeDayPlan.afterSelectedPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <ProgressBar
                        label="Current"
                        percentage={data.overallWholeDayPlan.currentPercentage}
                        healthy={data.overallWholeDayPlan.currentPercentage >= 75}
                      />
                      <ProgressBar
                        label={`After bunks (${data.overallWholeDayPlan.selectedClassCount} missed)`}
                        percentage={data.overallWholeDayPlan.afterSelectedPercentage}
                        healthy={data.overallWholeDayPlan.afterSelectedPercentage >= 75}
                      />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: 10,
                          color: "var(--text-secondary)",
                          fontSize: 14,
                        }}
                      >
                        <Metric
                          label="After"
                          value={`${data.overallWholeDayPlan.afterSelectedPresent}/${data.overallWholeDayPlan.afterSelectedTotal}`}
                        />
                        <Metric
                          label="Missed"
                          value={String(data.overallWholeDayPlan.selectedClassCount)}
                        />
                        <Metric
                          label="Attended"
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
                          className="standard-card rise-in"
                          key={`whole-day-${subject.id}`}
                          style={{
                            display: "grid",
                            gap: 10,
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
                              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                {subject.courseCode} - {subject.componentName}
                              </div>
                            </div>
                            <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                              <strong
                                style={{
                                  color:
                                    subject.currentPercentage >= 75
                                      ? "var(--success)"
                                      : "var(--danger)",
                                }}
                              >
                                Current: {subject.currentPercentage.toFixed(1)}%
                              </strong>
                              <span
                                style={{
                                  color:
                                    subject.afterSelectedPercentage >= 75
                                      ? "var(--success)"
                                      : "var(--danger)",
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}
                              >
                                After bunks: {subject.afterSelectedPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          <ProgressBar
                            label="Current"
                            percentage={subject.currentPercentage}
                            healthy={subject.currentPercentage >= 75}
                          />
                          <ProgressBar
                            label={`After bunks (${subject.selectedClassCount} missed)`}
                            percentage={subject.afterSelectedPercentage}
                            healthy={subject.afterSelectedPercentage >= 75}
                          />

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                              gap: 10,
                              color: "var(--text-secondary)",
                              fontSize: 14,
                            }}
                          >
                            <Metric
                              label="After"
                              value={`${subject.afterSelectedPresent}/${subject.afterSelectedTotal}`}
                            />
                            <Metric
                              label="Missed"
                              value={String(subject.selectedClassCount)}
                            />
                            <Metric
                              label="Attended"
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
          subtitle="Find the best days to recover your attendance."
        >
          {data.streakLoading ? (
            <EmptyMessage message="Loading recent attendance..." />
          ) : !data.streakIsReliable ? (
            <EmptyMessage message="Recent attendance is not available right now." />
          ) : leaveRescueDays.length === 0 ? (
            <EmptyMessage message="No missed classes in the last 4 weeks." />
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
                <div style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: "72ch" }}>
                  Turn missed days into recovery opportunities.
                </div>
                <div
                  className="status-badge status-badge--neutral"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {leaveRescueDays.length} day{leaveRescueDays.length === 1 ? "" : "s"} found
                </div>
                {selectedLeaveRescueDays.length > 0 && (
                  <div
                    className="status-badge status-badge--info"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
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
                      className={`standard-card interactive-row rise-in ${theme.borderClass}`}
                      key={`leave-rescue-featured-${day.dateKey}`}
                      onClick={() => handleLeaveRescueToggle(day.dateKey)}
                      style={{
                        display: "grid",
                        gap: 10,
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        font: "inherit",
                        background: isSelected ? "var(--primary-soft)" : undefined,
                        borderColor: isSelected ? "var(--primary)" : undefined,
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
                          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                            {day.dateKey}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
                          {isSelected && (
                            <span
                              className="status-badge"
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: "var(--primary)",
                                color: "var(--text-on-primary)",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              Selected
                            </span>
                          )}
                            <span
                              className={`status-badge ${day.intensity === "high" ? "status-badge--danger" : day.intensity === "medium" ? "status-badge--warning" : "status-badge--success"}`}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: theme.badgeBackground,
                                color: theme.color,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {theme.label}
                            </span>
                        </div>
                      </div>

                      <div style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 800 }}>
                        Missed {day.missed} of {day.total}
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                        Attended {day.attended} class{day.attended === 1 ? "" : "es"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {extraLeaveRescueDays.length > 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>More recovery days</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {extraLeaveRescueDays.map((day) => {
                      const theme = getLeaveRescueTheme(day.intensity);
                      const isSelected = selectedLeaveRescueDates.has(day.dateKey);

                      return (
                        <button
                          type="button"
                          className={`standard-card interactive-row ${theme.borderClass}`}
                          key={`leave-rescue-extra-${day.dateKey}`}
                          onClick={() => handleLeaveRescueToggle(day.dateKey)}
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                            width: "100%",
                            textAlign: "left",
                            cursor: "pointer",
                            font: "inherit",
                            background: isSelected ? "var(--primary-soft)" : undefined,
                            borderColor: isSelected ? "var(--primary)" : undefined,
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
                                color: "var(--text-muted)",
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
                              color: "var(--text-secondary)",
                              fontWeight: 700,
                              flexWrap: "wrap",
                              marginLeft: "auto",
                            }}
                          >
                            {isSelected && (
                              <span className="status-badge status-badge--info">
                                Selected
                              </span>
                            )}
                            <span
                              className={`status-badge ${day.intensity === "high" ? "status-badge--danger" : day.intensity === "medium" ? "status-badge--warning" : "status-badge--success"}`}
                              style={{ color: theme.color }}
                            >
                              {theme.label}
                            </span>
                            <span>
                              Missed {day.missed} of {day.total}
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
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg-card-subtle)",
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>Recovery preview</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {selectedLeaveRescueDays.length === 0
                        ? "Select days to preview the lift."
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
                      Clear
                    </button>
                  )}
                </div>

                {selectedLeaveRescueDays.length === 0 ? (
                  <EmptyMessage message="Select days to preview the impact." />
                ) : !leaveRescueImpact || !data.overallSummary ? (
                  <EmptyMessage message="Preview is not available right now." />
                ) : leaveRescueImpact.addedPresent === 0 ? (
                  <EmptyMessage message="No absences found on those days." />
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Overall impact</div>
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
                          label="Recovered"
                          value={String(leaveRescueImpact.addedPresent)}
                        />
                        <Metric
                          label="Present"
                          value={`${leaveRescueImpact.oldPresent} -> ${leaveRescueImpact.newPresent}`}
                        />
                        <Metric
                          label="Safe now"
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
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Subject impact</div>
                        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                          {leaveRescueImpact.unchangedSubjectsCount} unchanged
                        </span>
                        {leaveRescueImpact.stillRiskyCount > 0 && (
                          <span
                            className="status-badge status-badge--warning"
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {leaveRescueImpact.stillRiskyCount} still risky
                          </span>
                        )}
                      </div>

                      {leaveRescueImpact.impactedSubjects.length === 0 ? (
                        <EmptyMessage message="No subject changes for those days." />
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
                                className={`surface-card interactive-row rise-in ${impactTheme.borderClass}`}
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
                                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
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
                                  <span
                                    style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}
                                  >
                                    {formatPercentage(subject.oldPercentage)}
                                    {" -> "}
                                    {formatPercentage(subject.newPercentage)}
                                  </span>
                                  <span
                                    className={`status-badge ${subject.crossesThreshold ? "status-badge--success" : subject.stillRisky ? "status-badge--warning" : "status-badge--info"}`}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: 999,
                                      background: impactTheme.badgeBackground,
                                      color: impactTheme.color,
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                >
                                  {impactTheme.label}
                                </span>
                              </div>

                                <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
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
