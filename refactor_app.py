import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isSyncingFuture state
content = content.replace(
    'const [extensionDetected, setExtensionDetected] = useState(false);',
    'const [extensionDetected, setExtensionDetected] = useState(false);\n  const [isSyncingFuture, setIsSyncingFuture] = useState(false);'
)

# 2. Update syncDashboard
old_sync_dashboard = '''      const now = new Date();
      const [attendanceData, fetchedStudentInfo] = await Promise.all([
        callExtension("FETCH_ATTENDANCE", {}),
        callExtension("FETCH_STUDENT_ID", {}),
      ]);

      const fetchedWeekSchedules = [];
      for (let weekOffset = 0; weekOffset < FUTURE_WEEKS_TO_FETCH; weekOffset++) {
        fetchedWeekSchedules.push(
          await callExtension("FETCH_SCHEDULE", getWeekRange(now, weekOffset))
        );
      }

      const currentWeekSchedule = fetchedWeekSchedules[0] ?? [];
      const allFutureClasses = getUpcomingClasses(fetchedWeekSchedules.flat());
      const availableBunkDates = new Set(allFutureClasses.map(getScheduleDateKey));

      setAttendance(attendanceData);
      setStudentContextOverride(
        fetchedStudentInfo.studentId === null
          ? null
          : {
              studentId: fetchedStudentInfo.studentId,
              sessionId: fetchedStudentInfo.sessionId,
            },
      );
      setUpcomingClasses(getUpcomingClasses(currentWeekSchedule));
      setFutureClasses(allFutureClasses);
      setSelectedBunkDates((previous) => {
        const next = new Set<string>();

        for (const dateKey of previous) {
          if (availableBunkDates.has(dateKey)) {
            next.add(dateKey);
          }
        }

        return next;
      });
      setLoadState("ready");
    } catch (caughtError) {'''

new_sync_dashboard = '''      const now = new Date();
      const [attendanceData, fetchedStudentInfo, currentWeekScheduleUnfiltered] = await Promise.all([
        callExtension("FETCH_ATTENDANCE", {}),
        callExtension("FETCH_STUDENT_ID", {}),
        callExtension("FETCH_SCHEDULE", getWeekRange(now, 0))
      ]);

      const currentWeekSchedule = currentWeekScheduleUnfiltered ?? [];
      const currentWeekClasses = getUpcomingClasses(currentWeekSchedule);
      
      setAttendance(attendanceData);
      setStudentContextOverride(
        fetchedStudentInfo.studentId === null
          ? null
          : {
              studentId: fetchedStudentInfo.studentId,
              sessionId: fetchedStudentInfo.sessionId,
            },
      );
      setUpcomingClasses(currentWeekClasses);
      setFutureClasses(currentWeekClasses); // Base initial future classes
      setLoadState("ready");

      // Progressive Loading: Fetch remaining 11 weeks in background
      setIsSyncingFuture(true);
      void (async () => {
        try {
          const futureWeekSchedules = [];
          for (let weekOffset = 1; weekOffset < FUTURE_WEEKS_TO_FETCH; weekOffset++) {
            futureWeekSchedules.push(
              await callExtension("FETCH_SCHEDULE", getWeekRange(now, weekOffset))
            );
          }
          const allSchedules = [currentWeekScheduleUnfiltered, ...futureWeekSchedules];
          const allFutureClasses = getUpcomingClasses(allSchedules.flat());
          const availableBunkDates = new Set(allFutureClasses.map(getScheduleDateKey));
          
          setFutureClasses(allFutureClasses);
          setSelectedBunkDates((previous) => {
            const next = new Set<string>();
            for (const dateKey of previous) {
              if (availableBunkDates.has(dateKey)) {
                next.add(dateKey);
              }
            }
            return next;
          });
        } catch (error) {
          console.error("Failed to sync future weeks:", error);
        } finally {
          setIsSyncingFuture(false);
        }
      })();
    } catch (caughtError) {'''

content = content.replace(old_sync_dashboard, new_sync_dashboard)

# 3. Update handleClearSession
content = content.replace('setLoadState("idle");', 'setLoadState("idle");\n      setIsSyncingFuture(false);')

# 4. Add isSyncingFuture to StrategyData interface implicitly by passing it down.
# Let's see dashboardData
content = content.replace('    extensionDetected,', '    extensionDetected,\n    isSyncingFuture,')
content = content.replace('    bunkableDays,', '    bunkableDays,\n    isSyncingFuture,')


with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/pages/Strategy.tsx', 'r', encoding='utf-8') as f:
    s_content = f.read()

# Update StrategyData type if it exists in Strategy.tsx or App.tsx?
# In Strategy.tsx, there's `export interface StrategyData { ... }` or `data` props.
# Let's add it to Strategy.tsx
old_type = '''  streakLoading: boolean;
  streakIsReliable: boolean;
}'''

new_type = '''  streakLoading: boolean;
  streakIsReliable: boolean;
  isSyncingFuture?: boolean;
}'''
s_content = s_content.replace(old_type, new_type)

old_ui = '''      {data.bunkableDays.length === 0 ? (
        <Panel
          title="No upcoming classes"
          subtitle="You're all clear for the next few weeks."
        >
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 16 }}>
            Nothing to plan here right now.
          </div>
        </Panel>
      ) : ('''

new_ui = '''      {data.isSyncingFuture && data.bunkableDays.length === 0 ? (
        <Panel
          title="Syncing future schedule..."
          subtitle="Fetching the next few weeks in the background."
        >
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 16, opacity: 0.7, animation: "pulse 1.5s infinite" }}>
            Updating your planner...
          </div>
        </Panel>
      ) : data.bunkableDays.length === 0 ? (
        <Panel
          title="No upcoming classes"
          subtitle="You're all clear for the next few weeks."
        >
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 16 }}>
            Nothing to plan here right now.
          </div>
        </Panel>
      ) : ('''

s_content = s_content.replace(old_ui, new_ui)

with open('src/pages/Strategy.tsx', 'w', encoding='utf-8') as f:
    f.write(s_content)

