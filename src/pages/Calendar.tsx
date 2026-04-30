import React from "react";
import { Panel, EmptyMessage } from "../components/UI";
import type { ScheduleEntry } from "../types/kiet";
import { formatScheduleDay, formatScheduleTime, parseKietDateTime } from "../utils/date";

export interface CalendarData {
  upcomingClasses: ScheduleEntry[];
  currentWeekFullClasses: ScheduleEntry[];
}

export function CalendarPage({ data }: { data: CalendarData }) {
  const groupedClasses = data.currentWeekFullClasses.reduce((acc, cls) => {
    const dayLabel = formatScheduleDay(cls.start);
    if (!acc[dayLabel]) acc[dayLabel] = [];
    acc[dayLabel].push(cls);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  const dayLabels = Object.keys(groupedClasses);
  dayLabels.sort((a, b) => {
    return parseKietDateTime(groupedClasses[a][0].start).getTime() - parseKietDateTime(groupedClasses[b][0].start).getTime();
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="Weekly Timetable"
        subtitle="Your complete schedule for the current week."
      >
        {dayLabels.length === 0 ? (
          <EmptyMessage message="No classes found for this week." />
        ) : (
          <div style={{ overflowX: "auto", paddingBottom: 16, margin: "0 -4px", padding: "4px" }}>
            <div style={{ display: "flex", gap: 16, minWidth: "max-content" }}>
              {dayLabels.map((dayLabel) => (
                <div key={dayLabel} style={{ width: 280, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 16, 
                    color: "var(--text-primary)",
                    borderBottom: "2px solid var(--border-strong)", 
                    paddingBottom: 8, 
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <span>{dayLabel.split(',')[0]}</span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{dayLabel.split(',')[1]}</span>
                  </div>
                  
                  {groupedClasses[dayLabel].map((entry) => (
                    <div
                      className="standard-card schedule-reference-card interactive-row"
                      key={`${entry.courseCode ?? "holiday"}-${entry.start}-${entry.end}`}
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: "16px",
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
                          <strong style={{ lineHeight: 1.3, fontSize: 15 }}>{entry.courseName ?? entry.title}</strong>
                          <div style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>
                            {(entry.courseCode ?? "NA") + " - " + (entry.courseCompName ?? "CLASS")}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                        <span style={{ color: "var(--primary)" }}>🕒</span>
                        {formatScheduleTime(entry.start)} - {formatScheduleTime(entry.end)}
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                        {entry.classRoom && (
                          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                            📍 {entry.classRoom}
                          </div>
                        )}
                        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                          👨‍🏫 {entry.facultyName || "Faculty unavailable"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </section>
  );
}
