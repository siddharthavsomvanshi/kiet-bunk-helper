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
import { Panel, EmptyMessage } from "../components/UI";
import type {
  LoadState,
  SubjectSummary,
  OverallSummary,
  BunkableDay,
  StudentContext,
  DatewiseAttendanceState,
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
  expandedPlanners: Set<string>;
  expandedDatewise: Set<string>;
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
  handlePlannerToggle: (subjectId: string) => void;
  handleDatewiseToggle: (subject: SubjectSummary) => void;
  handleBunkToggle: (entry: ScheduleEntry) => void;
}

export function Dashboard({ data, handlers }: { data: DashboardData; handlers: DashboardHandlers }) {
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
                            <span
                              style={{
                                color:
                                  subject.projectedPercentage >= 75
                                    ? "var(--success)"
                                    : "var(--danger)",
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              If you attend the rest: {subject.projectedPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <ProgressBar
                          label="Current"
                          percentage={subject.percentage}
                          healthy={subject.percentage >= 75}
                        />
                        <ProgressBar
                          label={`If you attend the rest (${subject.upcomingCount} left)`}
                          percentage={subject.projectedPercentage}
                          healthy={subject.projectedPercentage >= 75}
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
                          <Metric label="Present" value={String(subject.present)} />
                          <Metric label="Extra" value={String(subject.extraAttendance)} />
                          <Metric label="Total" value={String(subject.total)} />
                          <Metric label="Upcoming" value={String(subject.upcomingCount)} />
                          <Metric label="Selected" value={String(subject.plannedBunkCount)} />
                          <Metric
                            label="If attended"
                            value={`${subject.projectedPresent}/${subject.projectedTotal}`}
                          />
                          <Metric label="Safe bunks" value={String(subject.safeBunks)} />
                          <Metric label="Needed to 75%" value={String(subject.classesNeeded)} />
                        </div>

                        {subject.upcomingCount > 0 && (
                          <div style={{ display: "grid", gap: 10 }}>
                            <button
                              className="action-button action-button--secondary"
                              type="button"
                              onClick={() => handlers.handlePlannerToggle(subject.id)}
                              style={secondaryButtonStyle}
                            >
                              {data.expandedPlanners.has(subject.id) ? "Hide bunk plan" : "Plan bunks"}
                            </button>

                            {data.expandedPlanners.has(subject.id) && (
                              <div
                                style={{
                                  display: "grid",
                                  gap: 10,
                                  padding: 14,
                                  borderRadius: 16,
                                  border: "1px dashed var(--border-color)",
                                  background: "var(--bg-body)",
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
                                    }}
                                  >
                                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                      After selected bunks
                                    </div>
                                    <div
                                      style={{
                                        color:
                                          subject.bunkAdjustedPercentage >= 75
                                            ? "var(--success)"
                                            : "var(--danger)",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {subject.bunkAdjustedPercentage.toFixed(1)}%
                                    </div>
                                  </div>

                                  <ProgressBar
                                    label={`After bunks (${subject.plannedBunkCount} selected)`}
                                    percentage={subject.bunkAdjustedPercentage}
                                    healthy={subject.bunkAdjustedPercentage >= 75}
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
                                      label="Current"
                                      value={`${subject.percentage.toFixed(1)}%`}
                                    />
                                    <Metric
                                      label="After"
                                      value={`${subject.bunkAdjustedPercentage.toFixed(1)}%`}
                                    />
                                    <Metric
                                      label="Change"
                                      value={formatPercentageDelta(subject.bunkImpact)}
                                    />
                                    <Metric
                                      label="Selected"
                                      value={String(subject.plannedBunkCount)}
                                    />
                                  </div>
                                </div>

                                <div style={{ display: "grid", gap: 8 }}>
                                  {subject.matchingUpcomingClasses.map((entry) => {
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
                                            {formatScheduleTime(entry.start)} -{" "}
                                            {formatScheduleTime(entry.end)}
                                          </div>
                                          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                            {entry.courseName ?? subject.title}
                                            {entry.classRoom ? ` - ${entry.classRoom}` : ""}
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ display: "grid", gap: 10 }}>
                          <button
                            className="action-button action-button--secondary"
                            type="button"
                            onClick={() => handlers.handleDatewiseToggle(subject)}
                            style={secondaryButtonStyle}
                          >
                              {data.expandedDatewise.has(subject.id)
                                ? "Hide attendance log"
                                : "View attendance log"}
                          </button>

                          {data.expandedDatewise.has(subject.id) && (
                            <div
                              style={{
                                display: "grid",
                                gap: 12,
                                padding: 14,
                                borderRadius: 16,
                                border: "1px dashed var(--border-color)",
                                background: "var(--bg-body)",
                              }}
                            >
                              <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                                See what was marked for each class.
                              </div>

                              {data.datewiseLoading.has(subject.id) ? (
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
                              ) : data.datewiseErrors[subject.id] ? (
                                <Notice tone="var(--danger)" background="var(--danger-soft)">
                                  {data.datewiseErrors[subject.id]}
                                </Notice>
                              ) : data.datewiseAttendance[subject.id] ? (
                                <>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                                      gap: 10,
                                      padding: 12,
                                      borderRadius: 14,
                                      border: "1px solid var(--border)",
                                      background: "var(--bg-card)",
                                    }}
                                  >
                                    <Metric
                                      label="Present"
                                      value={String(data.datewiseAttendance[subject.id].presentCount)}
                                    />
                                    <Metric
                                      label="Lectures"
                                      value={String(data.datewiseAttendance[subject.id].lectureCount)}
                                    />
                                    <Metric
                                      label="Extra"
                                      value={String(data.datewiseAttendance[subject.id].extraAttendance)}
                                    />
                                    <Metric
                                      label="Effective"
                                      value={`${data.datewiseAttendance[subject.id].percent?.toFixed(1) ?? "0.0"}%`}
                                    />
                                  </div>

                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 8,
                                      maxHeight: 360,
                                      overflowY: "auto",
                                      paddingRight: 4,
                                    }}
                                  >
                                    {data.datewiseAttendance[subject.id].lectures.map((lecture, index) => {
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
                                              <div
                                                style={{ fontWeight: 700, color: "var(--text-primary)" }}
                                              >
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
                                </>
                              ) : (
                                <EmptyMessage message="Open this to load the attendance log." />
                              )}
                            </div>
                          )}
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
        </>
      )}
    </>
  );
}
