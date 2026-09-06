import React from "react"
import { shortenFullName } from "../utils/schedule"

export const DAY_HUE_CLASSES = {
    0: "day-hue-blue",
    1: "day-hue-green",
    2: "day-hue-orange",
    3: "day-hue-pink",
    4: "day-hue-lilac",
    5: "day-hue-teal"
}

export default function ScheduleLessonCard({ lesson, dayIndex = 0 }) {
    const main = lesson.curricula?.[0]
    const teachers = [...new Set((lesson.curricula || []).map((c) => c.teachername).filter(Boolean))]

    // Distinct rooms
    const distinctRooms = [...new Set((lesson.curricula || []).map((c) => (c.roomname || "").trim()).filter(Boolean))]
    const validRooms = distinctRooms.filter((r) => r !== "?")
    const primaryRoom = validRooms.length > 0 ? validRooms.join(", ") : null

    const subjectName = main?.subjectname || main?.subjectabbr || "Предмет"
    const hueClass = DAY_HUE_CLASSES[dayIndex] || "day-hue-green"

    return (
        <article className="sched-lesson-card">
            {/* Top row: Badges and Room */}
            <div className="sched-card-top">
                <div className="sched-card-badges">
                    {lesson.type !== "full" && (
                        <span className={`sched-badge-week ${hueClass}`}>
                            {lesson.type === "upper" ? "↑ верхняя" : "↓ нижняя"}
                        </span>
                    )}
                    {lesson.isLecture && (
                        <span className="sched-badge-tag">
                            лек.
                        </span>
                    )}
                    {lesson.hasSubgroups && (
                        <span className="sched-badge-tag">
                            {lesson.subcount ? `${lesson.subcount} подгр.` : "подгруппы"}
                        </span>
                    )}
                </div>

                {!lesson.hasSubgroups && primaryRoom && (
                    <div className="sched-card-room mono">
                        {primaryRoom.toLowerCase().includes("онлайн") ? primaryRoom : `ауд. ${primaryRoom}`}
                    </div>
                )}
            </div>

            {/* Subject name with day taxonomy hue */}
            <h4 className={`sched-card-title ${hueClass}`}>
                {subjectName}
            </h4>

            {/* Teachers */}
            {teachers.length > 0 && (
                <p className="sched-card-teacher">
                    {teachers.map(shortenFullName).join(", ")}
                </p>
            )}

            {/* Subgroups list with specific rooms if any */}
            {lesson.hasSubgroups && lesson.curricula?.length > 0 && (
                <div className="sched-card-subgroups">
                    {lesson.curricula.map((c, i) => {
                        const room = c.roomname && c.roomname.trim() !== "?" ? c.roomname.trim() : null
                        return (
                            <span key={i} className="sched-subgroup-pill mono" title={c.teachername}>
                                <strong>#{c.subnum}</strong>
                                <span>{room ? (room.toLowerCase().includes("онлайн") ? room : `ауд. ${room}`) : "—"}</span>
                            </span>
                        )
                    })}
                </div>
            )}

            {/* Info note */}
            {lesson.info && (
                <div className="sched-card-info mono">
                    <span className="sched-info-dot" />
                    <span>{lesson.info}</span>
                </div>
            )}
        </article>
    )
}