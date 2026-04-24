import React, { useState, useEffect, useCallback } from "react";
import { callExtension } from "../utils/bridge";
import { getWeekRange, parseKietDateTime, formatIsoDate } from "../utils/date";
import type { StudentContext } from "../App";
import type { StudentDetails, ScheduleEntry, DatewiseAttendanceBucket } from "../types/kiet";
import { Notice, StatusCard, secondaryButtonStyle } from "../App";
import { Panel } from "../components/UI";
import { formatScheduleTime } from "../utils/date";

export interface TodayStatusProps {
  attendance: StudentDetails | null;
  studentContext: StudentContext | null;
}

type TodayClass = {
  entry: ScheduleEntry;
  courseId: number | null;
  courseComponentId: number | null;
  attendanceStatus: string | null;
  isLoading: boolean;
  error: string | null;
};

// Module-level cache to persist across component remounts during the same day
let moduleScheduleCache: ScheduleEntry[] | null = null;
let moduleAttendanceCache: Record<string, DatewiseAttendanceBucket[]> = {};
let moduleLastFetchDateIso: string | null = null;

export function TodayStatus({ attendance, studentContext }: TodayStatusProps) {
  const [hasFetched, setHasFetched] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);

  const fetchTodayData = useCallback(async (forceRefresh = false) => {
    if (!studentContext || !attendance) return;
    
    setIsLoadingSchedule(true);
    setScheduleError(null);
    try {
      const todayDateIso = formatIsoDate(new Date());

      // Invalidate cache if a new day has started or forceRefresh is true
      if (forceRefresh || moduleLastFetchDateIso !== todayDateIso) {
         moduleScheduleCache = null;
         moduleAttendanceCache = {};
         moduleLastFetchDateIso = todayDateIso;
      }

      let schedule = moduleScheduleCache;
      if (!schedule) {
         const weekRange = getWeekRange(new Date(), 0);
         schedule = await callExtension("FETCH_SCHEDULE", weekRange);
         moduleScheduleCache = schedule;
      }
      
      const entriesToday = (schedule || []).filter((entry: ScheduleEntry) => {
         if (entry.type !== "CLASS") return false;
         const entryDate = formatIsoDate(parseKietDateTime(entry.start));
         return entryDate === todayDateIso;
      }).sort((a: ScheduleEntry, b: ScheduleEntry) => parseKietDateTime(a.start).getTime() - parseKietDateTime(b.start).getTime());

      // Match entries with courseId and courseCompId
      const classesWithIds: TodayClass[] = entriesToday.map((entry: ScheduleEntry) => {
        let courseId: number | null = null;
        let courseComponentId: number | null = null;
        
        if (attendance.attendanceCourseComponentInfoList) {
           for (const course of attendance.attendanceCourseComponentInfoList) {
             if (course.courseCode.toUpperCase() === (entry.courseCode || "").toUpperCase()) {
               courseId = course.courseId;
               for (const comp of course.attendanceCourseComponentNameInfoList) {
                 if ((comp.componentName || "").toUpperCase() === (entry.courseCompName || "").toUpperCase()) {
                   courseComponentId = comp.courseComponentId;
                   break;
                 }
               }
               break;
             }
           }
        }
        
        return {
          entry,
          courseId,
          courseComponentId,
          attendanceStatus: null,
          isLoading: false,
          error: null,
        };
      });

      setTodayClasses(classesWithIds);
      setHasFetched(true);
      
      // Fetch attendance for each unique component
      const uniqueComponents = new Set<string>();
      classesWithIds.forEach(c => {
         if (c.courseId && c.courseComponentId) {
             uniqueComponents.add(`${c.courseId}-${c.courseComponentId}`);
         }
      });
      
      for (const compKey of uniqueComponents) {
         if (!moduleAttendanceCache[compKey]) {
            const [cId, ccId] = compKey.split("-").map(Number);
            setTodayClasses(prev => prev.map(tc => 
               (tc.courseId === cId && tc.courseComponentId === ccId) ? { ...tc, isLoading: true, error: null } : tc
            ));
            
            try {
               const res = await callExtension("FETCH_DATEWISE_ATTENDANCE", {
                  studentId: studentContext.studentId,
                  sessionId: studentContext.sessionId,
                  courseId: cId,
                  courseCompId: ccId,
               });
               moduleAttendanceCache[compKey] = res;
            } catch (err) {
               const errorMsg = err instanceof Error ? err.message : String(err);
               setTodayClasses(prev => prev.map(tc => 
                  (tc.courseId === cId && tc.courseComponentId === ccId) ? { ...tc, isLoading: false, error: errorMsg } : tc
               ));
            }
         }
      }
      
      // Update attendanceStatus mapping
      setTodayClasses(prev => prev.map(tc => {
         if (!tc.courseId || !tc.courseComponentId) return tc;
         const compKey = `${tc.courseId}-${tc.courseComponentId}`;
         const buckets = moduleAttendanceCache[compKey];
         if (!buckets) return tc;
         
         const lectures = buckets.flatMap((b: DatewiseAttendanceBucket) => b.lectureList || []).filter((l) => {
            if (!l.planLecDate) return false;
            return l.planLecDate === todayDateIso;
         });
         
         let matchedLecture = null;
         
         // Format start time to "hh:mm A" robustly for matching KIET's format "09:00 AM - 09:50 AM"
         const entryDateObj = parseKietDateTime(tc.entry.start);
         let kietTimeStart = new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
         }).format(entryDateObj).toUpperCase(); // e.g. "09:00 AM"

         // Standardize specific formatting quirks
         if (kietTimeStart.startsWith("0") && kietTimeStart.charAt(1) !== ":") {
             // Already "09:00 AM"
         } else if (kietTimeStart.length === 7) { // "9:00 AM" -> "09:00 AM"
             kietTimeStart = "0" + kietTimeStart;
         }

         for (const l of lectures) {
            if (l.timeSlot && l.timeSlot.toUpperCase().includes(kietTimeStart)) {
               matchedLecture = l;
               break;
            }
         }
         
         if (!matchedLecture && lectures.length > 0) {
            matchedLecture = lectures[0];
         }
         
         return {
            ...tc,
            isLoading: false,
            attendanceStatus: matchedLecture ? matchedLecture.attendance : null
         };
      }));
      
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingSchedule(false);
    }
  }, [attendance, studentContext]);

  useEffect(() => {
    if (!hasFetched && studentContext && attendance) {
      fetchTodayData();
    }
  }, [hasFetched, fetchTodayData, studentContext, attendance]);

  if (!attendance || !studentContext) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Notice tone="var(--danger)" background="var(--danger-soft)">
          Connect KIET on the dashboard first.
        </Notice>
      </div>
    );
  }

  const totalClasses = todayClasses.length;
  const presentCount = todayClasses.filter(c => String(c.attendanceStatus).toUpperCase() === "PRESENT").length;
  const absentCount = todayClasses.filter(c => String(c.attendanceStatus).toUpperCase() === "ABSENT").length;
  const notMarkedCount = todayClasses.filter(c => (!c.attendanceStatus || String(c.attendanceStatus).toUpperCase() === "NULL") && !c.isLoading && !c.error).length;
  
  return (
    <div className="rise-in" style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
            Today's attendance overview
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 15 }}>
            Check what's marked and what's missing.
          </p>
        </div>
        <button 
           className="action-button action-button--secondary"
           onClick={() => fetchTodayData(true)}
           disabled={isLoadingSchedule}
           style={{ ...secondaryButtonStyle, opacity: isLoadingSchedule ? 0.7 : 1 }}
        >
          {isLoadingSchedule ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {scheduleError && (
        <Notice tone="var(--danger)" background="var(--danger-soft)">{scheduleError}</Notice>
      )}

      {!isLoadingSchedule && totalClasses === 0 && !scheduleError && (
        <Panel title="No classes today" subtitle="Nothing is scheduled for today.">
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 16 }}>
            You're all clear for today.
          </div>
        </Panel>
      )}

      {totalClasses > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <StatusCard title="Classes" value={String(totalClasses)} tone="var(--text-primary)" />
            <StatusCard title="Present" value={String(presentCount)} tone="var(--success)" />
            <StatusCard title="Absent" value={String(absentCount)} tone="var(--danger)" />
            <StatusCard title="Not marked" value={String(notMarkedCount)} tone="var(--warning)" />
          </div>

          {(absentCount > 0 || notMarkedCount > 0) && (
            <div className={`standard-card ${absentCount > 0 ? 'border-l-danger' : 'border-l-warning'}`} style={{ padding: 16 }}>
              <h3 style={{ margin: "0 0 8px 0", color: absentCount > 0 ? "var(--danger)" : "var(--warning)", fontSize: 16 }}>Needs attention</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: absentCount > 0 ? "var(--danger)" : "var(--warning)" }}>
                {absentCount > 0 && <li>{absentCount} class{absentCount > 1 ? "es" : ""} marked absent.</li>}
                {notMarkedCount > 0 && <li>{notMarkedCount} class{notMarkedCount > 1 ? "es" : ""} not yet marked.</li>}
              </ul>
            </div>
          )}

          <Panel title="Today's classes" subtitle="See what is marked for each class.">
            <div style={{ display: "grid", gap: 12 }}>
              {todayClasses.map((tc, idx) => {
                 let statusDisplay = "Not marked";
                 let statusTheme = {
                   background: "var(--warning-soft)",
                   color: "var(--warning)",
                 };
                 
                 const currentStatus = String(tc.attendanceStatus).toUpperCase();

              if (tc.isLoading) {
                    statusDisplay = "Loading";
                    statusTheme = {
                      background: "var(--secondary-soft)",
                      color: "var(--secondary)",
                    };
                 } else if (tc.error) {
                    statusDisplay = "Couldn't load";
                    statusTheme = {
                      background: "var(--danger-soft)",
                      color: "var(--danger)",
                    };
                 } else if (currentStatus === "PRESENT") {
                    statusDisplay = "Present";
                    statusTheme = {
                      background: "var(--success-soft)",
                      color: "var(--success)",
                    };
                 } else if (currentStatus === "ABSENT") {
                    statusDisplay = "Absent";
                    statusTheme = {
                      background: "var(--danger-soft)",
                      color: "var(--danger)",
                    };
                 } else if (!tc.courseId || !tc.courseComponentId) {
                    statusDisplay = "Unavailable";
                    statusTheme = {
                      background: "var(--secondary-soft)",
                      color: "var(--secondary)",
                    };
                 }

                 const statusBadgeClass = tc.isLoading
                   ? "status-badge status-badge--neutral"
                   : tc.error
                     ? "status-badge status-badge--danger"
                     : currentStatus === "PRESENT"
                       ? "status-badge status-badge--success"
                       : currentStatus === "ABSENT"
                         ? "status-badge status-badge--danger"
                         : !tc.courseId || !tc.courseComponentId
                           ? "status-badge status-badge--neutral"
                           : "status-badge status-badge--warning";

                 return (
                   <div key={idx} className="standard-card interactive-row" style={{ 
                     display: "flex", 
                     justifyContent: "space-between", 
                     alignItems: "center",
                     flexWrap: "wrap",
                     gap: 12
                   }}>
                     <div style={{ display: "grid", gap: 4 }}>
                       <div
                         style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}
                       >
                         {tc.entry.courseName || tc.entry.title}
                       </div>
                       <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                          {formatScheduleTime(tc.entry.start)} - {formatScheduleTime(tc.entry.end)} - {tc.entry.courseCode} - {tc.entry.courseCompName}
                       </div>
                     </div>
                     <div
                        className={statusBadgeClass}
                        style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: statusTheme.background,
                        color: statusTheme.color,
                        fontWeight: 700,
                        fontSize: 14,
                        whiteSpace: "nowrap"
                     }}
                     >
                       {statusDisplay}
                     </div>
                   </div>
                 );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
