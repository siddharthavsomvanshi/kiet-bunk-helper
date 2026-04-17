import React from "react";
import { Panel, EmptyMessage } from "../App";
import type { ScheduleEntry } from "../types/kiet";
import { formatScheduleDay, formatScheduleTime } from "../utils/date";

export interface CalendarData {
  upcomingClasses: ScheduleEntry[];
}

export function CalendarPage({ data }: { data: CalendarData }) {
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="Upcoming Classes This Week"
        subtitle="Reference view of the current KIET week schedule."
      >
        {data.upcomingClasses.length === 0 ? (
          <EmptyMessage message="No future classes were found from the weekly schedule endpoint yet." />
        ) : (
          <div
            className="schedule-reference-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {data.upcomingClasses.map((entry) => (
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
        )}
      </Panel>
    </section>
  );
}
