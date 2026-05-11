import React from "react";
import {
  SetupCard,
  StatusCard,
  ProgressBar,
  Metric,
} from "../App";
import {
  Notice,
  primaryButtonStyle,
  secondaryButtonStyle,
  AttendanceSniper,
  formatPercentageDelta,
  formatStreakMetricValue,
  formatDatewiseLectureDate,
  getAttendanceStatusTheme,
  getScheduleEntryKey,
} from "../App";
import { Panel, EmptyMessage, OverlayDialog } from "../components/UI";
import type {
  LoadState,
  SubjectSummary,
  OverallSummary,
  BunkableDay,
  StudentContext,
  DatewiseAttendanceState,
  SubjectOverlayState,
} from "../App";
import type { ScheduleEntry, StudentDetails } from "../types/kiet";
import type { StreakResult } from "../utils/streak";
import { formatCapturedAt, formatScheduleDay, formatScheduleTime } from "../utils/date";

export interface DashboardData {
  extensionDetected: boolean;
  loadState: LoadState;
  sessionCapturedAt: number | null;
  attendance: StudentDetails | null;
  upcomingClasses: ScheduleEntry[];
  streakResult: StreakResult | null;
  streakLoading: boolean;
  error: string;
  studentContext: StudentContext | null;
  subjectSummaries: SubjectSummary[];
  overallSummary: OverallSummary | null;
  activeSubjectOverlay: SubjectOverlayState;
  datewiseLoading: Set<string>;
  datewiseErrors: Record<string, string>;
  datewiseAttendance: Record<string, DatewiseAttendanceState>;
  plannedBunks: Set<string>;
  bunkableDays: BunkableDay[];
}

export interface DashboardHandlers {
  handleConnectClick: () => void;
  syncDashboard: () => void;
  handleClearSession: () => void;
  openPlannerOverlay: (subjectId: string) => void;
  openDetailsOverlay: (subjectId: string) => void;
  openDatewiseOverlay: (subject: SubjectSummary) => void;
  closeSubjectOverlay: () => void;
  handleBunkToggle: (entry: ScheduleEntry) => void;
}

function formatClassCount(count: number) {
  return `${count} ${count === 1 ? "class" : "classes"}`;
}

function getSubjectAttendanceGuidance(subject: SubjectSummary) {
  if (subject.percentage < 75) {
    return {
      eyebrow: "Recovery needed",
      title: `You have to attend ${formatClassCount(subject.classesNeeded)} to reach 75%.`,
      detail: "Try not to miss any classes until this subject is back in the safe zone.",
      tone: "var(--danger)",
      background: "var(--danger-soft)",
      border: "var(--danger)",
    };
  }

  if (subject.safeBunks > 0) {
    return {
      eyebrow: "Attendance buffer",
      title: `You can miss ${formatClassCount(subject.safeBunks)} and still stay around 75%.`,
      detail: "Missing more than that would pull this subject below 75%.",
      tone: "var(--success)",
      background: "var(--success-soft)",
      border: "var(--success)",
    };
  }

  return {
    eyebrow: "At the edge",
    title: "Try not to miss any classes.",
    detail: "Missing even one more class would drop this subject below 75%.",
    tone: "var(--warning)",
    background: "var(--warning-soft)",
    border: "var(--warning)",
  };
}

export function Dashboard({ data, handlers }: { data: DashboardData; handlers: DashboardHandlers }) {
  const activeOverlaySubject = data.activeSubjectOverlay
    ? data.subjectSummaries.find((subject) => subject.id === data.activeSubjectOverlay?.subjectId) ?? null
    : null;
  const activeDatewiseSubject =
    data.activeSubjectOverlay?.kind === "attendance" ? activeOverlaySubject : null;
  const activeDetailsSubject =
    data.activeSubjectOverlay?.kind === "details" ? activeOverlaySubject : null;
  const activePlannerSubject =
    data.activeSubjectOverlay?.kind === "planner" ? activeOverlaySubject : null;
  const activeDatewiseState = activeDatewiseSubject
    ? data.datewiseAttendance[activeDatewiseSubject.id]
    : null;
  const activeDatewiseError = activeDatewiseSubject
    ? data.datewiseErrors[activeDatewiseSubject.id]
    : null;
  const isActiveDatewiseLoading = activeDatewiseSubject
    ? data.datewiseLoading.has(activeDatewiseSubject.id)
    : false;
  const activeOverlayGuidance = activeOverlaySubject
    ? getSubjectAttendanceGuidance(activeOverlaySubject)
    : null;

  return (
    <>
      <section
        className="standard-card rise-in border-l-primary"
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <span
          className="brand-kicker status-badge status-badge--neutral"
          style={{
            width: "fit-content",
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Attendance dashboard
        </span>

        <div style={{ display: "grid", gap: 12 }}>
          <h1
            className="display-title"
            style={{ margin: 0, fontSize: "clamp(2.5rem, 6vw, 4.9rem)", lineHeight: 0.95 }}
          >
            Attendance, simplified.
          </h1>
          <p
            className="hero-copy"
            style={{ margin: 0, maxWidth: 760, color: "var(--text-secondary)", fontSize: 18 }}
          >
            Everything you need to manage attendance in one place.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button
            className="action-button action-button--primary"
            type="button"
            onClick={handlers.handleConnectClick}
            disabled={!data.extensionDetected}
            style={primaryButtonStyle(!data.extensionDetected)}
          >
            Connect KIET
          </button>
          <button
            className="action-button action-button--secondary"
            type="button"
            onClick={handlers.syncDashboard}
            style={secondaryButtonStyle}
          >
            Refresh
          </button>
          <button
            className="action-button action-button--secondary"
            type="button"
            onClick={handlers.handleClearSession}
            style={secondaryButtonStyle}
          >
            Log out
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <StatusCard
            title="Connection"
            value={data.extensionDetected ? "Ready" : "Not ready"}
            tone={data.extensionDetected ? "var(--success)" : "var(--danger)"}
          />
          <StatusCard
            title="Sync status"
            value={
              data.loadState === "ready"
                ? "Synced"
                : data.loadState === "loading"
                  ? "Refreshing"
                  : data.loadState === "error"
                    ? "Needs attention"
                    : "Waiting"
            }
            tone={data.loadState === "error" ? "var(--danger)" : "var(--info)"}
          />
          <StatusCard
            title="Last sync"
            value={formatCapturedAt(data.sessionCapturedAt)}
            tone="var(--text-primary)"
          />
          <StatusCard
            title="Up next"
            value={String(data.upcomingClasses.length)}
            tone="var(--text-primary)"
          />
        </div>

        {data.error && <Notice tone="var(--danger)" background="var(--danger-soft)">{data.error}</Notice>}
      </section>

      {(!data.extensionDetected || !data.attendance) ? (
        <SetupCard hasData={!!data.attendance} />
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <StatusCard title="Student" value={data.attendance.fullName} tone="var(--text-primary)" />
            <StatusCard
              title="Registration"
              value={data.attendance.registrationNumber}
              tone="var(--text-primary)"
            />
            <StatusCard
              title="Branch"
              value={`${data.attendance.branchShortName} - ${data.attendance.sectionName}`}
              tone="var(--text-primary)"
            />
            <StatusCard title="Semester" value={data.attendance.semesterName} tone="var(--text-primary)" />
          </section>

          <section style={{ display: "grid", gap: 20 }}>
            <Panel
              title="Attendance overview"
              subtitle="See what is safe, risky, and worth fixing first."
            >
              {data.subjectSummaries.length === 0 ? (
                <EmptyMessage message="Connect KIET and refresh to load your attendance." />
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <div
                    className="overview-lead-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: 14,
                      alignItems: "start",
                    }}
                  >
                  {data.overallSummary && (
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
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 800, fontSize: 18 }}>Overall attendance</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                            Across all subjects.
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                          <strong
                            style={{
                              color:
                                data.overallSummary.percentage >= 75
                                  ? "var(--success)"
                                  : "var(--danger)",
                            }}
                          >
                            Current: {data.overallSummary.percentage.toFixed(1)}%
                          </strong>
                          <span
                            style={{
                              color:
                                data.overallSummary.projectedPercentage >= 75
                                  ? "var(--success)"
                                  : "var(--danger)",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            If you attend the rest: {data.overallSummary.projectedPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <ProgressBar
                        label="Current"
                        percentage={data.overallSummary.percentage}
                        healthy={data.overallSummary.percentage >= 75}
                      />
                      <ProgressBar
                        label={`If you attend the rest (${data.overallSummary.upcomingCount} left)`}
                        percentage={data.overallSummary.projectedPercentage}
                        healthy={data.overallSummary.projectedPercentage >= 75}
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
                        <Metric label="Present" value={String(data.overallSummary.present)} />
                        <Metric label="Total" value={String(data.overallSummary.total)} />
                        <Metric
                          label="If attended"
                          value={`${data.overallSummary.projectedPresent}/${data.overallSummary.projectedTotal}`}
                        />
                        <Metric label="Selected" value={String(data.overallSummary.plannedBunkCount)} />
                        <Metric label="Left" value={String(data.overallSummary.upcomingCount)} />
                        <Metric
                          label="Streak"
                          value={formatStreakMetricValue(data.streakResult, data.streakLoading)}
                        />
                      </div>
                    </div>
                  )}
                  </div>

                  <div
                    className="overview-subject-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                      gap: 14,
                      alignItems: "start",
                    }}
                  >
                    {data.subjectSummaries.map((subject) => {
                      const isDanger = subject.percentage < 75;
                      const isWarning = subject.percentage >= 75 && subject.percentage < 80;
                      const borderClass = isDanger ? "border-l-danger" : isWarning ? "border-l-warning" : "border-l-success";
                      const attendanceGuidance = getSubjectAttendanceGuidance(subject);
                      return (
                      <div
                        className={`standard-card rise-in ${borderClass}`}
                        key={subject.id}
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
                          <div style={{ flex: 1, minWidth: 120 }}>
                            <div style={{ fontWeight: 700 }}>{subject.title}</div>
                            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                              {subject.courseCode} - {subject.componentName}
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                            <strong
                              style={{
                                color: subject.percentage >= 75 ? "var(--success)" : "var(--danger)",
                              }}
                            >
                              Current: {subject.percentage.toFixed(1)}%
                            </strong>
                          </div>
                        </div>

                        <ProgressBar
                          label="Current"
                          percentage={subject.percentage}
                          healthy={subject.percentage >= 75}
                        />

                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            padding: 14,
                            borderRadius: 16,
                            border: `1px solid ${attendanceGuidance.border}`,
                            background: attendanceGuidance.background,
                          }}
                        >
                          <div
                            style={{
                              color: attendanceGuidance.tone,
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            {attendanceGuidance.eyebrow}
                          </div>
                          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
                            {attendanceGuidance.title}
                          </div>
                          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                            {attendanceGuidance.detail}
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                          <button
                            className="action-button action-button--secondary"
                            type="button"
                            onClick={() => handlers.openDetailsOverlay(subject.id)}
                            style={secondaryButtonStyle}
                          >
                            View details
                          </button>
                        </div>

                        {subject.upcomingCount > 0 && (
                          <div style={{ display: "grid", gap: 10 }}>
                            <button
                              className="action-button action-button--secondary"
                              type="button"
                              onClick={() => handlers.openPlannerOverlay(subject.id)}
                              style={secondaryButtonStyle}
                            >
                              Plan bunks
                            </button>
                          </div>
                        )}

                        <div style={{ display: "grid", gap: 10 }}>
                          <button
                            className="action-button action-button--secondary"
                            type="button"
                            onClick={() => handlers.openDatewiseOverlay(subject)}
                            style={secondaryButtonStyle}
                          >
                            View attendance log
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Panel>
          </section>

          <section style={{ display: "grid", gap: 14 }}>
            <AttendanceSniper data={data.overallSummary} schedule={data.bunkableDays} />
          </section>

          {data.upcomingClasses.length > 0 && (
            <section style={{ display: "grid", gap: 14 }}>
              <Panel
                title="Coming up"
                subtitle="Your next few classes."
              >
                <div
                  className="schedule-reference-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 12,
                  }}
                >
                  {data.upcomingClasses.slice(0, 3).map((entry) => (
                    <div
                      className="surface-card schedule-reference-card interactive-row"
                      key={`${entry.courseCode ?? "holiday"}-${entry.start}-${entry.end}`}
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: 14,
                        borderRadius: 18,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "start",
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{entry.courseName ?? entry.title}</strong>
                          <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                            {(entry.courseCode ?? "NA") + " - " + (entry.courseCompName ?? "CLASS")}
                          </div>
                        </div>
                        <span
                          className="status-badge status-badge--info"
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatScheduleDay(entry.start)}
                        </span>
                      </div>

                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        {formatScheduleTime(entry.start)} - {formatScheduleTime(entry.end)}
                        {entry.classRoom ? ` - ${entry.classRoom}` : ""}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        {entry.facultyName ? `Faculty: ${entry.facultyName}` : "Faculty unavailable"}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          )}

          {activeDetailsSubject && (
            <OverlayDialog
              title={activeDetailsSubject.title}
              subtitle={`${activeDetailsSubject.courseCode} - ${activeDetailsSubject.componentName}`}
              onClose={handlers.closeSubjectOverlay}
              headerAction={
                <span
                  className={`status-badge ${
                    activeDetailsSubject.percentage >= 75
                      ? "status-badge--success"
                      : "status-badge--danger"
                  }`}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Current {activeDetailsSubject.percentage.toFixed(1)}%
                </span>
              }
            >
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  Full breakdown for this subject.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                  }}
                >
                  <Metric label="Present" value={String(activeDetailsSubject.present)} />
                  <Metric label="Extra" value={String(activeDetailsSubject.extraAttendance)} />
                  <Metric label="Total" value={String(activeDetailsSubject.total)} />
                  <Metric label="Upcoming" value={String(activeDetailsSubject.upcomingCount)} />
                  <Metric label="Selected" value={String(activeDetailsSubject.plannedBunkCount)} />
                  <Metric
                    label="If all this week"
                    value={`${activeDetailsSubject.projectedPresent}/${activeDetailsSubject.projectedTotal}`}
                  />
                  <Metric label="Safe bunks" value={String(activeDetailsSubject.safeBunks)} />
                  <Metric label="Needed to 75%" value={String(activeDetailsSubject.classesNeeded)} />
                </div>

                {activeOverlayGuidance && (
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      padding: 14,
                      borderRadius: 16,
                      border: `1px solid ${activeOverlayGuidance.border}`,
                      background: activeOverlayGuidance.background,
                    }}
                  >
                    <div
                      style={{
                        color: activeOverlayGuidance.tone,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {activeOverlayGuidance.eyebrow}
                    </div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
                      {activeOverlayGuidance.title}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {activeOverlayGuidance.detail}
                    </div>
                  </div>
                )}
              </div>
            </OverlayDialog>
          )}

          {activePlannerSubject && (
            <OverlayDialog
              title={activePlannerSubject.title}
              subtitle={`${activePlannerSubject.courseCode} - ${activePlannerSubject.componentName}`}
              onClose={handlers.closeSubjectOverlay}
              headerAction={
                <span
                  className="status-badge status-badge--info"
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Selected {activePlannerSubject.plannedBunkCount}
                </span>
              }
            >
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  minHeight: 0,
                  height: "100%",
                  gridTemplateRows: "auto auto minmax(0, 1fr)",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  Choose the classes you may skip this week.
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
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
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      After selected bunks
                    </div>
                    <div
                      style={{
                        color:
                          activePlannerSubject.bunkAdjustedPercentage >= 75
                            ? "var(--success)"
                            : "var(--danger)",
                        fontWeight: 700,
                      }}
                    >
                      {activePlannerSubject.bunkAdjustedPercentage.toFixed(1)}%
                    </div>
                  </div>

                  <ProgressBar
                    label={`After bunks (${activePlannerSubject.plannedBunkCount} selected)`}
                    percentage={activePlannerSubject.bunkAdjustedPercentage}
                    healthy={activePlannerSubject.bunkAdjustedPercentage >= 75}
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
                    <Metric label="Current" value={`${activePlannerSubject.percentage.toFixed(1)}%`} />
                    <Metric
                      label="After"
                      value={`${activePlannerSubject.bunkAdjustedPercentage.toFixed(1)}%`}
                    />
                    <Metric
                      label="Change"
                      value={formatPercentageDelta(activePlannerSubject.bunkImpact)}
                    />
                    <Metric label="Selected" value={String(activePlannerSubject.plannedBunkCount)} />
                  </div>
                </div>

                {activePlannerSubject.matchingUpcomingClasses.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      minHeight: 0,
                      overflowY: "auto",
                      paddingRight: 4,
                      alignContent: "start",
                    }}
                  >
                    {activePlannerSubject.matchingUpcomingClasses.map((entry) => {
                      const entryKey = getScheduleEntryKey(entry);
                      const isChecked = data.plannedBunks.has(entryKey);

                      return (
                        <label
                          className="surface-card interactive-row"
                          key={entryKey}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "20px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "start",
                            padding: 12,
                            borderRadius: 14,
                            border: `1px solid ${isChecked ? "var(--primary)" : "var(--border)"}`,
                            background: isChecked ? "var(--primary-soft)" : "var(--bg-card)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlers.handleBunkToggle(entry)}
                            style={{ marginTop: 3 }}
                          />
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                              {formatScheduleDay(entry.start)}
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                              {formatScheduleTime(entry.start)} - {formatScheduleTime(entry.end)}
                            </div>
                            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                              {entry.courseName ?? activePlannerSubject.title}
                              {entry.classRoom ? ` - ${entry.classRoom}` : ""}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyMessage message="No bunkable classes are available for this subject right now." />
                )}
              </div>
            </OverlayDialog>
          )}

          {activeDatewiseSubject && (
            <OverlayDialog
              title={activeDatewiseSubject.title}
              subtitle={`${activeDatewiseSubject.courseCode} - ${activeDatewiseSubject.componentName}`}
              onClose={handlers.closeSubjectOverlay}
              headerAction={
                <span
                  className={`status-badge ${
                    activeDatewiseSubject.percentage >= 75
                      ? "status-badge--success"
                      : "status-badge--danger"
                  }`}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Current {activeDatewiseSubject.percentage.toFixed(1)}%
                </span>
              }
            >
              <div
                style={{
                  display: "grid",
                  gap: 18,
                  minHeight: 0,
                  height: "100%",
                  gridTemplateRows:
                    activeDatewiseState &&
                    !isActiveDatewiseLoading &&
                    !activeDatewiseError
                      ? "auto minmax(0, 1fr)"
                      : undefined,
                }}
              >
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    See what was marked for each class.
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                    }}
                  >
                    <ProgressBar
                      label="Current"
                      percentage={activeDatewiseSubject.percentage}
                      healthy={activeDatewiseSubject.percentage >= 75}
                    />
                    <ProgressBar
                      label={`If attended all classes this week (${activeDatewiseSubject.upcomingCount} left)`}
                      percentage={activeDatewiseSubject.projectedPercentage}
                      healthy={activeDatewiseSubject.projectedPercentage >= 75}
                    />
                  </div>

                  {activeOverlayGuidance && (
                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                        padding: 14,
                        borderRadius: 16,
                        border: `1px solid ${activeOverlayGuidance.border}`,
                        background: activeOverlayGuidance.background,
                      }}
                    >
                      <div
                        style={{
                          color: activeOverlayGuidance.tone,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {activeOverlayGuidance.eyebrow}
                      </div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
                        {activeOverlayGuidance.title}
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {activeOverlayGuidance.detail}
                      </div>
                    </div>
                  )}

                  {isActiveDatewiseLoading ? (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        background: "var(--bg-card)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      Loading attendance log...
                    </div>
                  ) : activeDatewiseError ? (
                    <Notice tone="var(--danger)" background="var(--danger-soft)">
                      {activeDatewiseError}
                    </Notice>
                  ) : activeDatewiseState ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 10,
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                      }}
                    >
                      <Metric label="Present" value={String(activeDatewiseState.presentCount)} />
                      <Metric label="Lectures" value={String(activeDatewiseState.lectureCount)} />
                      <Metric label="Extra" value={String(activeDatewiseState.extraAttendance)} />
                      <Metric
                        label="Effective"
                        value={`${activeDatewiseState.percent?.toFixed(1) ?? "0.0"}%`}
                      />
                    </div>
                  ) : (
                    <EmptyMessage message="Open this to load the attendance log." />
                  )}
                </div>

                {activeDatewiseState && !isActiveDatewiseLoading && !activeDatewiseError && (
                  activeDatewiseState.lectures.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        minHeight: 0,
                        overflowY: "auto",
                        paddingRight: 4,
                        alignContent: "start",
                      }}
                    >
                      {activeDatewiseState.lectures.map((lecture, index) => {
                        const statusTheme = getAttendanceStatusTheme(lecture.attendance);

                        return (
                          <div
                            className="surface-card interactive-row"
                            key={`${lecture.planLecDate ?? "unknown"}-${lecture.timeSlot ?? index}-${lecture.attendance ?? "na"}`}
                            style={{
                              display: "grid",
                              gap: 8,
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid var(--border)",
                              background: "var(--bg-card)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "start",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ display: "grid", gap: 4 }}>
                                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                  {formatDatewiseLectureDate(
                                    lecture.planLecDate,
                                    lecture.dayName,
                                  )}
                                </div>
                                <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                                  {lecture.timeSlot ?? "Time not available"}
                                </div>
                                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                  {lecture.lectureType ?? "Lecture type unavailable"}
                                </div>
                              </div>

                              <span
                                className="status-badge"
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  background: statusTheme.background,
                                  color: statusTheme.color,
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                {lecture.attendance ?? "Not marked"}
                              </span>
                            </div>

                            {lecture.attendanceAdjustmentDetails && (
                              <div
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  background: "var(--bg-card-subtle)",
                                  color: "var(--text-secondary)",
                                  fontSize: 13,
                                }}
                              >
                                {lecture.attendanceAdjustmentDetails}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyMessage message="No lecture entries were returned for this subject." />
                  )
                )}
              </div>
            </OverlayDialog>
          )}
        </>
      )}
    </>
  );
}
