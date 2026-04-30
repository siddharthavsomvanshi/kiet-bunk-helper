import re

with open('src/pages/TodayStatus.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    'import { getWeekRange, parseKietDateTime, formatIsoDate } from "../utils/date";',
    'import { getWeekRange, parseKietDateTime, formatIsoDate, getPreviousWorkingDay, formatDisplayDate } from "../utils/date";'
)

# 2. Update cache vars
content = content.replace(
    'let moduleScheduleCache: ScheduleEntry[] | null = null;',
    'let moduleScheduleCaches: Record<string, ScheduleEntry[]> = {};'
)

# 3. Update component body
old_body = '''  const [hasFetched, setHasFetched] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);

  const fetchTodayData = useCallback(async (forceRefresh = false) => {'''

new_body = '''  const [mode, setMode] = useState<"today" | "yesterday">("today");
  const [hasFetchedToday, setHasFetchedToday] = useState(false);
  const [hasFetchedYesterday, setHasFetchedYesterday] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [yesterdayClasses, setYesterdayClasses] = useState<TodayClass[]>([]);

  const fetchDailyData = useCallback(async (targetMode: "today" | "yesterday", forceRefresh = false) => {'''

content = content.replace(old_body, new_body)

# 4. Update fetch logic inside fetchDailyData
old_fetch_logic = '''    try {
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
      const classesWithIds: TodayClass[] = entriesToday.map((entry: ScheduleEntry) => {'''

new_fetch_logic = '''    try {
      const currentDateIso = formatIsoDate(new Date());
      const targetDateObj = targetMode === "today" ? new Date() : getPreviousWorkingDay(new Date());
      const targetDateIso = formatIsoDate(targetDateObj);

      // Invalidate cache if a new day has started or forceRefresh is true
      if (forceRefresh || moduleLastFetchDateIso !== currentDateIso) {
         moduleScheduleCaches = {};
         moduleAttendanceCache = {};
         moduleLastFetchDateIso = currentDateIso;
         if (forceRefresh) {
            setHasFetchedToday(false);
            setHasFetchedYesterday(false);
         }
      }

      const weekRange = getWeekRange(targetDateObj, 0);
      let schedule = moduleScheduleCaches[weekRange.weekStartDate];
      if (!schedule) {
         schedule = await callExtension("FETCH_SCHEDULE", weekRange);
         moduleScheduleCaches[weekRange.weekStartDate] = schedule;
      }
      
      const entriesForDay = (schedule || []).filter((entry: ScheduleEntry) => {
         if (entry.type !== "CLASS") return false;
         const entryDate = formatIsoDate(parseKietDateTime(entry.start));
         return entryDate === targetDateIso;
      }).sort((a: ScheduleEntry, b: ScheduleEntry) => parseKietDateTime(a.start).getTime() - parseKietDateTime(b.start).getTime());

      // Match entries with courseId and courseCompId
      const classesWithIds: TodayClass[] = entriesForDay.map((entry: ScheduleEntry) => {'''

content = content.replace(old_fetch_logic, new_fetch_logic)

# 5. Update setTodayClasses in fetchDailyData
content = content.replace('      setTodayClasses(classesWithIds);\n      setHasFetched(true);', '''      const setTargetClasses = targetMode === "today" ? setTodayClasses : setYesterdayClasses;
      setTargetClasses(classesWithIds);
      
      if (targetMode === "today") setHasFetchedToday(true);
      else setHasFetchedYesterday(true);''')

# 6. Update setTodayClasses in the rest of the file
content = content.replace('setTodayClasses(prev => prev.map(tc =>', 'setTargetClasses(prev => prev.map(tc =>')

# 7. Update filter in lectures
content = content.replace('return l.planLecDate === todayDateIso;', 'return l.planLecDate === targetDateIso;')

# 8. Update useEffect
old_use_effect = '''  useEffect(() => {
    if (!hasFetched && studentContext && attendance) {
      fetchTodayData();
    }
  }, [hasFetched, fetchTodayData, studentContext, attendance]);'''

new_use_effect = '''  useEffect(() => {
    if (studentContext && attendance) {
       if (mode === "today" && !hasFetchedToday) {
          fetchDailyData("today");
       } else if (mode === "yesterday" && !hasFetchedYesterday) {
          fetchDailyData("yesterday");
       }
    }
  }, [mode, hasFetchedToday, hasFetchedYesterday, fetchDailyData, studentContext, attendance]);

  const handleModeChange = (newMode: "today" | "yesterday") => {
     if (newMode !== mode) {
        setMode(newMode);
     }
  };'''

content = content.replace(old_use_effect, new_use_effect)

# 9. Update UI rendering constants
old_ui_consts = '''  const totalClasses = todayClasses.length;
  const presentCount = todayClasses.filter(c => String(c.attendanceStatus).toUpperCase() === "PRESENT").length;
  const absentCount = todayClasses.filter(c => String(c.attendanceStatus).toUpperCase() === "ABSENT").length;
  const notMarkedCount = todayClasses.filter(c => (!c.attendanceStatus || String(c.attendanceStatus).toUpperCase() === "NULL") && !c.isLoading && !c.error).length;'''

new_ui_consts = '''  const activeClasses = mode === "today" ? todayClasses : yesterdayClasses;
  const totalClasses = activeClasses.length;
  const presentCount = activeClasses.filter(c => String(c.attendanceStatus).toUpperCase() === "PRESENT").length;
  const absentCount = activeClasses.filter(c => String(c.attendanceStatus).toUpperCase() === "ABSENT").length;
  const notMarkedCount = activeClasses.filter(c => (!c.attendanceStatus || String(c.attendanceStatus).toUpperCase() === "NULL") && !c.isLoading && !c.error).length;'''

content = content.replace(old_ui_consts, new_ui_consts)

# 10. Update UI rendering structure
old_ui_top = '''      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
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
      )}'''

new_ui_top = '''      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
            {mode === "today" ? "Today's attendance" : `Yesterday (${formatDisplayDate(getPreviousWorkingDay(new Date()))})`}
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 15 }}>
            {mode === "today" ? "Check what's marked and what's missing." : "Review what was marked yesterday."}
          </p>
        </div>
        <button 
           className="action-button action-button--secondary"
           onClick={() => fetchDailyData(mode, true)}
           disabled={isLoadingSchedule}
           style={{ ...secondaryButtonStyle, opacity: isLoadingSchedule ? 0.7 : 1 }}
        >
          {isLoadingSchedule ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, padding: 4, background: "var(--bg-secondary)", borderRadius: 12, width: "fit-content" }}>
        <button
          onClick={() => handleModeChange("today")}
          style={{
             padding: "8px 16px",
             borderRadius: 8,
             border: "none",
             fontWeight: 600,
             fontSize: 14,
             cursor: "pointer",
             background: mode === "today" ? "var(--bg-primary)" : "transparent",
             color: mode === "today" ? "var(--text-primary)" : "var(--text-muted)",
             boxShadow: mode === "today" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
             transition: "all 0.2s ease"
          }}
        >
          Today
        </button>
        <button
          onClick={() => handleModeChange("yesterday")}
          style={{
             padding: "8px 16px",
             borderRadius: 8,
             border: "none",
             fontWeight: 600,
             fontSize: 14,
             cursor: "pointer",
             background: mode === "yesterday" ? "var(--bg-primary)" : "transparent",
             color: mode === "yesterday" ? "var(--text-primary)" : "var(--text-muted)",
             boxShadow: mode === "yesterday" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
             transition: "all 0.2s ease"
          }}
        >
          Yesterday
        </button>
      </div>

      {scheduleError && (
        <Notice tone="var(--danger)" background="var(--danger-soft)">{scheduleError}</Notice>
      )}

      {!isLoadingSchedule && totalClasses === 0 && !scheduleError && (
        <Panel title={`No classes ${mode}`} subtitle={`Nothing is scheduled for ${mode}.`}>
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 16 }}>
            You're all clear for {mode}.
          </div>
        </Panel>
      )}'''

content = content.replace(old_ui_top, new_ui_top)

# 11. Update panel title and map source
content = content.replace('<Panel title="Today\'s classes" subtitle="See what is marked for each class.">', '<Panel title={`${mode === "today" ? "Today\'s" : "Yesterday\'s"} classes`} subtitle="See what is marked for each class.">')
content = content.replace('{todayClasses.map((tc, idx) => {', '{activeClasses.map((tc, idx) => {')


with open('src/pages/TodayStatus.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
