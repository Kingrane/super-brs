import React, { useEffect, useMemo, useState, useCallback } from "react"
import StateLoading from "./StateLoading"
import StateEmpty from "./StateEmpty"
import StateError from "./StateError"
import ScheduleLessonCard, { DAY_HUE_CLASSES } from "./ScheduleLessonCard"
import { fetchScheduleGrades, fetchGroupsForGrade, fetchScheduleForGroup, fetchScheduleTimeList } from "../api/schedule"
import {
    DAY_NAMES,
    SHORT_DAY_NAMES,
    DEFAULT_TIME_SLOTS,
    buildTimeSlots,
    mergeScheduleData,
    groupByDay,
    filterByWeek,
    formatGroupName,
    formatGradeName
} from "../utils/schedule"

const STORAGE_KEY_GRADE = "schedule_grade_id"
const STORAGE_KEY_GROUP = "schedule_group_id"

const WEEK_OPTIONS = [
    { value: "all", label: "Все недели" },
    { value: "upper", label: "Верхняя" },
    { value: "lower", label: "Нижняя" }
]

function readStored(key, fallback = "") {
    try {
        return localStorage.getItem(key) || fallback
    } catch {
        return fallback
    }
}

function writeStored(key, value) {
    try {
        localStorage.setItem(key, value)
    } catch {
        return
    }
}

export default function ScheduleView() {
    const [grades, setGrades] = useState([])
    const [gradeId, setGradeId] = useState("")
    const [groups, setGroups] = useState([])
    const [groupId, setGroupId] = useState("")
    const [schedule, setSchedule] = useState(null)
    const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS)
    const [weekType, setWeekType] = useState("all")
    const [request, setRequest] = useState("loading")
    const [error, setError] = useState("")

    const today = new Date().getDay()
    const todayIndex = today === 0 ? 6 : today - 1
    const [mobileDay, setMobileDay] = useState(() => (todayIndex >= 0 && todayIndex <= 5 ? todayIndex : 0))

    const loadGroups = useCallback(async (gid, { force = false } = {}) => {
        const list = await fetchGroupsForGrade(gid, { force })
        setGroups(list)
        return list
    }, [])

    const loadSchedule = useCallback(async (gid, { force = false } = {}) => {
        setRequest("loading")
        setError("")
        try {
            const data = await fetchScheduleForGroup(gid, { force })
            setSchedule(data)
            setRequest("success")
        } catch (e) {
            setError(e.message || "Не удалось загрузить расписание")
            setRequest("error")
        }
    }, [])

    const pickDefaultGroup = useCallback((list, preferredId) => {
        const match = preferredId && list.find((g) => String(g.id) === String(preferredId))
        if (match) return match
        const fiit4 = list.find((g) => String(g.name).toUpperCase().includes("ФИИТ") && Number(g.num) === 4)
        return fiit4 || list[0] || null
    }, [])

    const selectGrade = useCallback(async (gid, { force = false } = {}) => {
        setGradeId(gid)
        writeStored(STORAGE_KEY_GRADE, gid)
        const list = await loadGroups(gid, { force })
        if (!list.length) {
            setGroups([])
            setGroupId("")
            setSchedule(null)
            setRequest("success")
            return
        }
        const storedGroup = readStored(STORAGE_KEY_GROUP, "")
        const next = pickDefaultGroup(list, storedGroup)
        setGroupId(String(next.id))
        writeStored(STORAGE_KEY_GROUP, String(next.id))
        await loadSchedule(next.id, { force })
    }, [loadGroups, loadSchedule, pickDefaultGroup])

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const [gradeList, timeList] = await Promise.all([
                    fetchScheduleGrades(),
                    fetchScheduleTimeList().catch(() => [])
                ])
                setTimeSlots(buildTimeSlots(timeList))
                setGrades(gradeList)

                const storedGrade = readStored(STORAGE_KEY_GRADE, "")
                const preferred = gradeList.find((g) => String(g.id) === String(storedGrade))
                const fallback = gradeList.find((g) => g.degree === "bachelor" && Number(g.num) === 2)
                    || (storedGrade && preferred)
                    || gradeList[0]

                if (fallback) {
                    await selectGrade(String(fallback.id))
                } else {
                    setRequest("success")
                }
            } catch (e) {
                setError(e.message || "Не удалось загрузить курсы")
                setRequest("error")
            }
        }
        bootstrap()
    }, [selectGrade])

    const handleGradeChange = async (event) => {
        const gid = event.target.value
        if (!gid) return
        try {
            setRequest("loading")
            setGradeId(gid)
            writeStored(STORAGE_KEY_GRADE, gid)
            const list = await loadGroups(gid)
            setGroups(list)
            if (!list.length) {
                setGroupId("")
                setSchedule(null)
                setRequest("success")
                return
            }
            const storedGroup = readStored(STORAGE_KEY_GROUP, "")
            const next = pickDefaultGroup(list, storedGroup)
            setGroupId(String(next.id))
            writeStored(STORAGE_KEY_GROUP, String(next.id))
            await loadSchedule(next.id)
        } catch {
            setRequest("error")
        }
    }

    const handleGroupChange = async (event) => {
        const gid = event.target.value
        if (!gid) return
        setGroupId(gid)
        writeStored(STORAGE_KEY_GROUP, gid)
        await loadSchedule(gid)
    }

    const handleWeekChange = (value) => {
        setWeekType(value)
    }

    const handleRetry = async () => {
        if (groupId) {
            await loadSchedule(groupId, { force: true })
        } else if (grades.length) {
            await selectGrade(gradeId || String(grades[0].id), { force: true })
        }
    }

    const merged = useMemo(() => {
        if (!schedule) return []
        return mergeScheduleData(schedule.lessons, schedule.curricula)
    }, [schedule])

    const grouped = useMemo(() => {
        if (request !== "success") return {}
        return groupByDay(filterByWeek(merged, weekType))
    }, [merged, weekType, request])

    const selectedGroup = groups.find((g) => String(g.id) === String(groupId)) || null
    const selectedGrade = grades.find((g) => String(g.id) === String(gradeId)) || null
    const hasAnyLessons = merged.length > 0

    const currentWeekLabel = weekType === "upper" ? "Верхняя" : weekType === "lower" ? "Нижняя" : "Все недели"

    return (
        <section className="sched-view">
            {/* Header info matching raspisanie */}
            <div className="sched-header-block">
                <div>
                    <p className="kicker">&#123; Расписание занятий &#125;</p>
                    <h2 className="sched-headline">РАСПИСАНИЕ</h2>
                    <div className="sched-subinfo mono">
                        {selectedGrade ? formatGradeName(selectedGrade) : "Курс не выбран"}
                        <span className="sched-subinfo-sep">/</span>
                        {selectedGroup ? formatGroupName(selectedGroup) : "Группа не выбрана"}
                        <span className="sched-subinfo-sep">/</span>
                        неделя: {currentWeekLabel}
                    </div>
                </div>

                <div className="sched-toolbar-controls">
                    <label className="field field-inline" style={{ margin: 0 }}>
                        <select className="input select sched-select" value={String(gradeId)} onChange={handleGradeChange} disabled={request === "loading" && !groups.length}>
                            {grades.map((grade) => (
                                <option key={String(grade.id)} value={String(grade.id)}>
                                    {formatGradeName(grade)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="field field-inline" style={{ margin: 0 }}>
                        <select className="input select sched-select" value={String(groupId)} onChange={handleGroupChange} disabled={!groups.length}>
                            {groups.length === 0 ? (
                                <option value="">Группы не найдены</option>
                            ) : (
                                groups.map((group) => (
                                    <option key={String(group.id)} value={String(group.id)}>
                                        {formatGroupName(group)}
                                    </option>
                                ))
                            )}
                        </select>
                    </label>

                    <div className="sched-week-toggle" role="group" aria-label="Неделя">
                        {WEEK_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`btn btn-sm ${weekType === option.value ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => handleWeekChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <button className="btn btn-ghost" type="button" onClick={handleRetry} disabled={request === "loading"} title="Обновить расписание">
                        Обновить
                    </button>
                </div>
            </div>

            {request === "loading" && (
                <main className="card panel-body sched-panel">
                    <StateLoading />
                </main>
            )}

            {request === "error" && (
                <main className="card panel-body sched-panel">
                    <StateError title="Не удалось загрузить расписание" details={error} onRetry={handleRetry} />
                </main>
            )}

            {request === "success" && !hasAnyLessons && (
                <main className="card panel-body sched-panel">
                    <StateEmpty
                        title="Расписание пока пусто"
                        description="На выбранную неделю занятий не нашлось. Возможно, учебный год ещё не начался или расписание не опубликовано."
                    />
                </main>
            )}

            {request === "success" && hasAnyLessons && (
                <main className="sched-content">
                    {/* МОБИЛЬНЫЙ ВИД: Вкладки дней недели + карточки слотов (как в raspisanie) */}
                    <div className="sched-mobile-container">
                        <div className="sched-mobile-days-grid">
                            {DAY_NAMES.map((dName, dIdx) => {
                                const isSelected = mobileDay === dIdx
                                const isToday = todayIndex === dIdx
                                return (
                                    <button
                                        key={dName}
                                        type="button"
                                        onClick={() => setMobileDay(dIdx)}
                                        className={`sched-mobile-day-pill ${isSelected ? "is-selected" : ""} sched-day-${dIdx}`}
                                    >
                                        <span className="sched-mobile-day-code">{SHORT_DAY_NAMES[dIdx]}</span>
                                        {isToday && <span className="sched-mobile-today-dot" />}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="sched-mobile-day-heading">
                            <span className="sched-mobile-day-title">{DAY_NAMES[mobileDay]}</span>
                            {todayIndex === mobileDay && <span className="sched-today-tag mono">сегодня</span>}
                        </div>

                        <div className="sched-mobile-slots-list">
                            {(() => {
                                const dayLessons = grouped[mobileDay] || []
                                const activeSlots = timeSlots.map((slot) => {
                                    const slotLessons = dayLessons.filter((l) => l.start === slot.start)
                                    return { slot, lessons: slotLessons }
                                }).filter((s) => s.lessons.length > 0)

                                if (activeSlots.length === 0) {
                                    return (
                                        <div className="sched-empty-day-card card">
                                            Пар нет, можно отдыхать 🎉
                                        </div>
                                    )
                                }

                                return activeSlots.map(({ slot, lessons }) => (
                                    <div key={slot.start} className="sched-mobile-slot-block card">
                                        <div className="sched-mobile-slot-time mono">
                                            <span className="sched-slot-dot" />
                                            <span>{slot.start} – {slot.end}</span>
                                        </div>
                                        <div className="sched-mobile-slot-lessons">
                                            {lessons.map((lesson, idx) => (
                                                <ScheduleLessonCard key={lesson.id || idx} lesson={lesson} dayIndex={mobileDay} />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            })()}
                        </div>
                    </div>

                    {/* ДЕСКТОПНЫЙ ВИД: Полноформатная таблица-сетка со временем слева и днями недели */}
                    <div className="sched-desktop-container card">
                        <div className="sched-table-wrapper">
                            {/* Заголовок таблицы: время + дни */}
                            <div className="sched-timetable-head">
                                <div className="sched-time-col-head mono">Время</div>
                                {DAY_NAMES.map((dayName, index) => {
                                    const isToday = index === todayIndex
                                    return (
                                        <div key={dayName} className={`sched-day-head-cell sched-day-${index} ${isToday ? "is-today" : ""}`}>
                                            <div className="sched-day-head-name">{dayName}</div>
                                            <div className="sched-day-head-sub">
                                                <span>{SHORT_DAY_NAMES[index]}</span>
                                                {isToday && <span className="sched-today-inline mono">сегодня</span>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Строки временных слотов */}
                            {timeSlots.map((slot) => {
                                return (
                                    <div key={slot.start} className="sched-timetable-row">
                                        {/* Ячейка времени (sticky) */}
                                        <div className="sched-time-cell mono">
                                            <span className="sched-time-start">{slot.start}</span>
                                            <span className="sched-time-end">{slot.end}</span>
                                        </div>

                                        {/* Ячейки дней для этого слота */}
                                        {DAY_NAMES.map((dayName, dayIdx) => {
                                            const dayLessons = (grouped[dayIdx] || []).filter((l) => l.start === slot.start)
                                            const isToday = dayIdx === todayIndex
                                            const hasLessons = dayLessons.length > 0

                                            return (
                                                <div
                                                    key={`${dayName}-${slot.start}`}
                                                    className={`sched-cell sched-day-${dayIdx} ${isToday ? "sched-cell-today" : ""} ${hasLessons ? "has-lessons" : "is-empty"}`}
                                                >
                                                    {hasLessons ? (
                                                        <div className="sched-cell-content">
                                                            {dayLessons.map((lesson, idx) => (
                                                                <ScheduleLessonCard
                                                                    key={lesson.id || idx}
                                                                    lesson={lesson}
                                                                    dayIndex={dayIdx}
                                                                />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="sched-empty-cell mono">—</div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </main>
            )}

            <p className="footer-credit footer-credit-dashboard sched-credit">
                {selectedGroup ? `Расписание · ${formatGroupName(selectedGroup)}` : "Расписание"}
            </p>
        </section>
    )
}