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
        className="hero-card rise-in"
        style={{
          display: "grid",
          gap: 18,
          padding: 24,
          borderRadius: 30,
          border: "1px solid rgba(15, 23, 42, 0.08)",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(244, 250, 255, 0.76))",
          boxShadow: "0 30px 90px rgba(15, 23, 42, 0.10)",
        }}
      >
        <span
          className="brand-kicker"
          style={{
            width: "fit-content",
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.74)",
            color: "#0f3b52",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Bunk Helper
        </span>

        <div style={{ display: "grid", gap: 12 }}>
          <h1
            className="display-title"
            style={{ margin: 0, fontSize: "clamp(2.5rem, 6vw, 4.9rem)", lineHeight: 0.95 }}
          >
            Attendance that feels useful, not buried.
          </h1>
          <p className="hero-copy" style={{ margin: 0, maxWidth: 760, color: "#475569", fontSize: 18 }}>
            The extension keeps your KIET session inside the browser, then fetches attendance and
            weekly schedule data on demand. No password storage, no token in the URL, and a
            cleaner base for analytics.
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
            Connect with KIET ERP
          </button>
          <button
            className="action-button action-button--secondary"
            type="button"
            onClick={handlers.syncDashboard}
            style={secondaryButtonStyle}
          >
            Refresh dashboard
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
            title="Extension"
            value={data.extensionDetected ? "Detected" : "Not detected"}
            tone={data.extensionDetected ? "#166534" : "#991b1b"}
          />
          <StatusCard
            title="Dashboard State"
            value={data.loadState === "ready" ? "Synced" : data.loadState}
            tone={data.loadState === "error" ? "#991b1b" : "#1d4ed8"}
          />
          <StatusCard
            title="Session Captured"
            value={formatCapturedAt(data.sessionCapturedAt)}
            tone="#0f172a"
          />
          <StatusCard
            title="Upcoming Classes"
            value={String(data.upcomingClasses.length)}
            tone="#0f172a"
          />
        </div>

        {data.error && <Notice tone="#991b1b" background="#fee2e2">{data.error}</Notice>}
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
            <StatusCard title="Student" value={data.attendance.fullName} tone="#0f172a" />
            <StatusCard title="Registration" value={data.attendance.registrationNumber} tone="#0f172a" />
            <StatusCard
              title="Branch"
              value={`${data.attendance.branchShortName} - ${data.attendance.sectionName}`}
              tone="#0f172a"
            />
            <StatusCard title="Semester" value={data.attendance.semesterName} tone="#0f172a" />
          </section>

          <section style={{ display: "grid", gap: 20 }}>
            <Panel
              title="Attendance Overview"
              subtitle="Keep the attendance view wide and readable. Open the whole-day planner from the strategy page when you want to simulate bigger bunk plans."
            >
              {data.subjectSummaries.length === 0 ? (
                <EmptyMessage message="Sync the dashboard after connecting your KIET session to load attendance data." />
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
                      className="surface-card surface-card--highlight rise-in"
                      style={{
                        display: "grid",
                        gap: 10,
                        padding: 18,
                        borderRadius: 24,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        background: "linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%)",
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
                          <div style={{ fontWeight: 800, fontSize: 18 }}>Overall Attendance</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>
                            Combined across all attendance components
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                          <strong
                            style={{
                              color: data.overallSummary.percentage >= 75 ? "#166534" : "#b91c1c",
                            }}
                          >
                            Current: {data.overallSummary.percentage.toFixed(1)}%
                          </strong>
                          <span
                            style={{
                              color:
                                data.overallSummary.projectedPercentage >= 75 ? "#166534" : "#b91c1c",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            If attended all remaining: {data.overallSummary.projectedPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <ProgressBar
                        label="Current overall"
                        percentage={data.overallSummary.percentage}
                        healthy={data.overallSummary.percentage >= 75}
                      />
                      <ProgressBar
                        label={`If attended all remaining (${data.overallSummary.upcomingCount} upcoming)`}
                        percentage={data.overallSummary.projectedPercentage}
                        healthy={data.overallSummary.projectedPercentage >= 75}
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
                        <Metric label="Present" value={String(data.overallSummary.present)} />
                        <Metric label="Total" value={String(data.overallSummary.total)} />
                        <Metric
                          label="Projected"
                          value={`${data.overallSummary.projectedPresent}/${data.overallSummary.projectedTotal}`}
                        />
                        <Metric label="Planned" value={String(data.overallSummary.plannedBunkCount)} />
                        <Metric label="Upcoming" value={String(data.overallSummary.upcomingCount)} />
                        <Metric
                          label="🔥 STREAK"
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
                    {data.subjectSummaries.map((subject) => (
                      <div
                        className="surface-card rise-in"
                        key={subject.id}
                        style={{
                          display: "grid",
                          gap: 10,
                          padding: 16,
                          borderRadius: 22,
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 250, 252, 0.92) 100%)",
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
                            <div style={{ color: "#64748b", fontSize: 13 }}>
                              {subject.courseCode} - {subject.componentName}
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                            <strong
                              style={{ color: subject.percentage >= 75 ? "#166534" : "#b91c1c" }}
                            >
                              Current: {subject.percentage.toFixed(1)}%
                            </strong>
                            <span
                              style={{
                                color: subject.projectedPercentage >= 75 ? "#166534" : "#b91c1c",
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              If attended all remaining: {subject.projectedPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <ProgressBar
                          label="Current"
                          percentage={subject.percentage}
                          healthy={subject.percentage >= 75}
                        />
                        <ProgressBar
                          label={`If attended all remaining (${subject.upcomingCount} upcoming)`}
                          percentage={subject.projectedPercentage}
                          healthy={subject.projectedPercentage >= 75}
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
                          <Metric label="Present" value={String(subject.present)} />
                          <Metric label="Extra Attendance" value={String(subject.extraAttendance)} />
                          <Metric label="Total Classes" value={String(subject.total)} />
                          <Metric label="Upcoming Classes" value={String(subject.upcomingCount)} />
                          <Metric label="Planned Bunks" value={String(subject.plannedBunkCount)} />
                          <Metric
                            label="Projected Present"
                            value={`${subject.projectedPresent}/${subject.projectedTotal}`}
                          />
                          <Metric label="Safe Bunks" value={String(subject.safeBunks)} />
                          <Metric label="Recovery Needed" value={String(subject.classesNeeded)} />
                        </div>

                        {subject.upcomingCount > 0 && (
                          <div style={{ display: "grid", gap: 10 }}>
                            <button
                              className="action-button action-button--secondary"
                              type="button"
                              onClick={() => handlers.handlePlannerToggle(subject.id)}
                              style={secondaryButtonStyle}
                            >
                              {data.expandedPlanners.has(subject.id) ? "Hide bunk planner" : "Plan bunk"}
                            </button>

                            {data.expandedPlanners.has(subject.id) && (
                              <div
                                className="surface-card surface-card--muted"
                                style={{
                                  display: "grid",
                                  gap: 10,
                                  padding: 14,
                                  borderRadius: 16,
                                  border: "1px dashed rgba(15, 23, 42, 0.2)",
                                  background: "#f8fafc",
                                }}
                              >
                                <div style={{ color: "#475569", fontSize: 14 }}>
                                  We have {subject.upcomingCount} upcoming class
                                  {subject.upcomingCount === 1 ? "" : "es"} this week. Select the
                                  ones you plan to bunk.
                                </div>

                                <div
                                  style={{
                                    display: "grid",
                                    gap: 10,
                                    padding: 12,
                                    borderRadius: 14,
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
                                    }}
                                  >
                                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                      Attendance after selected bunks
                                    </div>
                                    <div
                                      style={{
                                        color:
                                          subject.bunkAdjustedPercentage >= 75
                                            ? "#166534"
                                            : "#b91c1c",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {subject.bunkAdjustedPercentage.toFixed(1)}%
                                    </div>
                                  </div>

                                  <ProgressBar
                                    label={`After bunk (${subject.plannedBunkCount} selected)`}
                                    percentage={subject.bunkAdjustedPercentage}
                                    healthy={subject.bunkAdjustedPercentage >= 75}
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
                                      label="Current"
                                      value={`${subject.percentage.toFixed(1)}%`}
                                    />
                                    <Metric
                                      label="After Bunk"
                                      value={`${subject.bunkAdjustedPercentage.toFixed(1)}%`}
                                    />
                                    <Metric
                                      label="Change"
                                      value={formatPercentageDelta(subject.bunkImpact)}
                                    />
                                    <Metric
                                      label="Selected Bunks"
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
                                        className="surface-card"
                                        key={entryKey}
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "20px minmax(0, 1fr)",
                                          gap: 10,
                                          alignItems: "start",
                                          padding: 12,
                                          borderRadius: 14,
                                          border: "1px solid rgba(15, 23, 42, 0.08)",
                                          background: isChecked ? "#fee2e2" : "#fff",
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handlers.handleBunkToggle(entry)}
                                          style={{ marginTop: 3 }}
                                        />
                                        <div style={{ display: "grid", gap: 4 }}>
                                          <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                            {formatScheduleDay(entry.start)}
                                          </div>
                                          <div style={{ color: "#475569", fontSize: 14 }}>
                                            {formatScheduleTime(entry.start)} -{" "}
                                            {formatScheduleTime(entry.end)}
                                          </div>
                                          <div style={{ color: "#64748b", fontSize: 13 }}>
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
                              ? "Hide date-wise attendance"
                              : "View date-wise attendance"}
                          </button>

                          {data.expandedDatewise.has(subject.id) && (
                            <div
                              className="surface-card surface-card--muted"
                              style={{
                                display: "grid",
                                gap: 12,
                                padding: 14,
                                borderRadius: 16,
                                border: "1px dashed rgba(15, 23, 42, 0.2)",
                                background: "#f8fafc",
                              }}
                            >
                              <div style={{ color: "#475569", fontSize: 14 }}>
                                This is the official date-wise attendance mark for this subject and
                                component.
                              </div>

                              {data.datewiseLoading.has(subject.id) ? (
                                <div
                                  style={{
                                    padding: 12,
                                    borderRadius: 14,
                                    background: "#fff",
                                    color: "#475569",
                                    border: "1px solid rgba(15, 23, 42, 0.08)",
                                  }}
                                >
                                  Loading date-wise attendance...
                                </div>
                              ) : data.datewiseErrors[subject.id] ? (
                                <Notice tone="#991b1b" background="#fee2e2">
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
                                      border: "1px solid rgba(15, 23, 42, 0.08)",
                                      background: "#fff",
                                    }}
                                  >
                                    <Metric
                                      label="Marked Present"
                                      value={String(data.datewiseAttendance[subject.id].presentCount)}
                                    />
                                    <Metric
                                      label="Total Lectures"
                                      value={String(data.datewiseAttendance[subject.id].lectureCount)}
                                    />
                                    <Metric
                                      label="Extra Attendance"
                                      value={String(data.datewiseAttendance[subject.id].extraAttendance)}
                                    />
                                    <Metric
                                      label="Effective %"
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
                                          className="surface-card"
                                          key={`${lecture.planLecDate ?? "unknown"}-${lecture.timeSlot ?? index}-${lecture.attendance ?? "na"}`}
                                          style={{
                                            display: "grid",
                                            gap: 8,
                                            padding: 12,
                                            borderRadius: 14,
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            background: "#fff",
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
                                              <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                                {formatDatewiseLectureDate(
                                                  lecture.planLecDate,
                                                  lecture.dayName,
                                                )}
                                              </div>
                                              <div style={{ color: "#475569", fontSize: 14 }}>
                                                {lecture.timeSlot ?? "Time not available"}
                                              </div>
                                              <div style={{ color: "#64748b", fontSize: 13 }}>
                                                {lecture.lectureType ?? "Lecture type unavailable"}
                                              </div>
                                            </div>

                                            <span
                                              style={{
                                                padding: "6px 10px",
                                                borderRadius: 999,
                                                background: statusTheme.background,
                                                color: statusTheme.color,
                                                fontWeight: 700,
                                                fontSize: 12,
                                              }}
                                            >
                                              {lecture.attendance ?? "NOT MARKED"}
                                            </span>
                                          </div>

                                          {lecture.attendanceAdjustmentDetails && (
                                            <div
                                              style={{
                                                padding: "10px 12px",
                                                borderRadius: 12,
                                                background: "#f8fafc",
                                                color: "#475569",
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
                                <EmptyMessage message="Open this once to load the official date-wise attendance from KIET." />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
                title="Upcoming Classes Preview"
                subtitle="Next few classes scheduled."
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
                      className="surface-card schedule-reference-card"
                      key={`${entry.courseCode ?? "holiday"}-${entry.start}-${entry.end}`}
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: 14,
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
                          alignItems: "start",
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{entry.courseName ?? entry.title}</strong>
                          <div style={{ color: "#475569", fontSize: 14 }}>
                            {(entry.courseCode ?? "NA") + " - " + (entry.courseCompName ?? "CLASS")}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "rgba(29, 78, 216, 0.08)",
                            color: "#1d4ed8",
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatScheduleDay(entry.start)}
                        </span>
                      </div>

                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        {formatScheduleTime(entry.start)} - {formatScheduleTime(entry.end)}
                        {entry.classRoom ? ` - ${entry.classRoom}` : ""}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        {entry.facultyName ? `Faculty: ${entry.facultyName}` : "Faculty not listed"}
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
