import React from "react"

export default function ModuleCardList({ subjectInfo, disciplineMap, submodules }) {
    if (!disciplineMap?.Modules) {
        return null
    }

    const modules = Object.values(disciplineMap.Modules)
    const allSubmodules = Object.values(submodules || {})
    const submoduleIds = Object.keys(submodules || {})

    const isExamType = /exam|difftest|coursework/i.test(String(subjectInfo?.Type || ''))

    const examSubIds = new Set()
    const examModuleIds = new Set()
    for (const [id, sm] of Object.entries(submodules || {})) {
        const t = (sm.Title || '').trim()
        if (t === '' && isExamType) examSubIds.add(id)
        else if (/экзамен|exam|зачёт|аттестац|итогов/i.test(t)) examSubIds.add(id)
    }
    for (const mod of modules) {
        if (/экзамен|exam|зачёт|аттестац|итогов/i.test(mod.Title || '')) {
            ;(mod.Submodules || []).forEach(id => examSubIds.add(id))
            examModuleIds.add(mod.Title || '')
        }
    }

    const examId = [...examSubIds][0] || null
    const examSm = examId ? submodules[examId] : null
    const examRate = subjectInfo?.ExamRate ?? subjectInfo?.Exam?.Rate ?? disciplineMap?.Exam?.Rate ?? disciplineMap?.Final?.Rate ?? examSm?.Rate ?? null
    const examMax = 40

    const regSubs = allSubmodules.filter((sm, i) => !examSubIds.has(submoduleIds[i]))
    const examSubs = allSubmodules.filter((sm, i) => examSubIds.has(submoduleIds[i]))
    const regRate = regSubs.reduce((s, sm) => s + (Number(sm.Rate) || 0), 0)
    const regMax = regSubs.reduce((s, sm) => s + (Number(sm.MaxRate) || 0), 0)
    const exRate = examSubs.reduce((s, sm) => s + (Number(sm.Rate) || 0), 0)
    const exMax = 40

    const examFoundInSubs = examSubIds.size > 0
    const addExRate = (examFoundInSubs || !isExamType) ? 0 : (Number(examRate) || 0)
    const showExamRate = examFoundInSubs ? exRate : examRate
    const showExamMax = examFoundInSubs ? exMax : examMax
    const hasExamData = isExamType && (examFoundInSubs || (examRate != null && examMax != null))

    const totalRate = regRate + exRate + addExRate
    const totalMax = 100

    return (
        <div className="module-list">
            {modules.map((module, idx) => (
                <article key={`${idx}-${module.Title || "module"}`} className="module-card">
                    <header>
                        <h4>{module.Title || "Модуль"}</h4>
                    </header>
                    <ul>
                        {(module.Submodules || []).filter(id => !examSubIds.has(id)).map((submoduleID) => {
                            const info = submodules[submoduleID] || {}
                            return (
                                <li key={String(submoduleID)}>
                                    <span>{info.Title || `Подмодуль ${submoduleID}`}</span>
                                    <span className="mono">{info.Rate ?? "-"} / {info.MaxRate ?? "-"}</span>
                                </li>
                            )
                        })}
                        {(module.Submodules || []).filter(id => !examSubIds.has(id)).length === 0 && (
                            <li>
                                <span>Нет подмодулей</span>
                                <span className="mono">-</span>
                            </li>
                        )}
                    </ul>
                </article>
            ))}
            <div className="module-total">
                <span>Итого по модулям</span>
                <span className="mono">{regRate} / {isExamType ? regMax : totalMax}</span>
            </div>
            {hasExamData && (
                <div className="module-exam">
                    <span>Экзамен</span>
                    <span className="mono">{showExamRate ?? "-"} / {showExamMax ?? "-"}</span>
                </div>
            )}
            <div className="module-total module-total-grand">
                <span>Итого</span>
                <span className="mono">{totalRate} / {totalMax}</span>
            </div>
        </div>
    )
}
