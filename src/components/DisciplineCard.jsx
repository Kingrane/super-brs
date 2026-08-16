import React from "react"
import { formatDisciplineType, formatTeacherShortName, getGradePresentation, getIndexTeachersForDiscipline } from "../utils/formatters"

export default function DisciplineCard({ discipline, mark, active, index, teachersMap, onClick }) {
    const id = String(discipline.ID)
    const grade = getGradePresentation(mark, discipline)
    const teachers = getIndexTeachersForDiscipline(teachersMap, id)
    const teachersPreview = teachers.slice(0, 2).map((teacher) => formatTeacherShortName(teacher)).join(" · ")
    const teachersOverflow = teachers.length > 2 ? ` +${teachers.length - 2}` : ""
    const points = discipline.MaxCurrentRate ? `${discipline.Rate || 0} / ${discipline.MaxCurrentRate}` : `${discipline.Rate || 0}`

    return (
        <button
            className={`disc-item ${active ? "disc-item-active" : ""}`.trim()}
            data-id={id}
            type="button"
            style={{ "--delay": `${index * 50}ms` }}
            onClick={onClick}
        >
            <div className="disc-item-head">
                <span className="disc-title">{discipline.SubjectName || "Без названия"}</span>
                <span className={`grade-chip grade-${grade.tone}`}>{grade.text}</span>
            </div>
            <div className="disc-item-meta">
                <span>{formatDisciplineType(discipline.Type)}</span>
                <span className="mono">{points} б.</span>
            </div>
            <div
                className="disc-item-teachers"
                title={teachers.map((teacher) => formatTeacherShortName(teacher)).join(", ") || "Преподаватели не указаны"}
            >
                {teachersPreview || "Преподаватели не указаны"}{teachersOverflow}
            </div>
        </button>
    )
}
