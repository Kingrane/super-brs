import React from "react"
import StateLoading from "../components/StateLoading"
import StateEmpty from "../components/StateEmpty"
import StateError from "../components/StateError"
import DisciplineCard from "../components/DisciplineCard"
import TeacherRow from "../components/TeacherRow"
import JournalTable from "../components/JournalTable"
import EventsTable from "../components/EventsTable"
import ModuleCardList from "../components/ModuleCardList"
import ScheduleView from "../components/ScheduleView"
import { formatDisciplineType, formatSemesterLabel, getGradePresentation, parseEventsData } from "../utils/formatters"

export default function DashboardView({
    active,
    mainNav,
    setMainNav,
    token,
    semesters,
    currentSemesterID,
    handleSemesterChange,
    disciplines,
    marks,
    teachersMap,
    selectedDisciplineID,
    selectedDiscipline,
    selectDiscipline,
    detail,
    globalEventsData,
    request,
    lastMainLoadError,
    loadIndex,
    loadGlobalEvents,
    activeTab,
    setActiveTab,
    mergedTeachers,
    debugLog,
    handleRefresh,
    handleLogout
}) {
    const [mobileView, setMobileView] = React.useState("list")

    React.useEffect(() => {
        setMobileView("list")
    }, [currentSemesterID, mainNav])

    React.useEffect(() => {
        if (!selectedDisciplineID) {
            setMobileView("list")
        }
    }, [selectedDisciplineID])

    const handleDisciplineClick = (id) => {
        selectDiscipline(id)
        setMobileView("detail")
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    }

    const handleBackToList = () => {
        setMobileView("list")
    }

    const selectedMark = selectedDiscipline
        ? marks[String(selectedDiscipline.ID)] || marks[selectedDiscipline.ID] || ""
        : ""
    const selectedGrade = selectedDiscipline ? getGradePresentation(selectedMark, selectedDiscipline) : { text: "-" }

    const parsedGlobalEvents = parseEventsData(globalEventsData)

    const renderDisciplines = () => {
        if (request.index === "loading") {
            return <StateLoading />
        }

        if (!disciplines.length) {
            return <StateEmpty title="Нет дисциплин" description="В выбранном семестре не найдено дисциплин." />
        }

        return disciplines.map((discipline, index) => {
            const id = String(discipline.ID)
            const mark = marks[id] || marks[discipline.ID] || ""
            const isActive = selectedDisciplineID === id

            return (
                <DisciplineCard
                    key={id}
                    discipline={discipline}
                    mark={mark}
                    active={isActive}
                    index={index}
                    teachersMap={teachersMap}
                    onClick={() => handleDisciplineClick(id)}
                />
            )
        })
    }

    const renderGradeTab = () => {
        if (!selectedDiscipline) {
            return <StateEmpty title="Выберите дисциплину" description="Откройте дисциплину в списке слева." />
        }

        if (request.detail === "loading") {
            return <StateLoading />
        }

        if (request.detail === "error") {
            return (
                <StateError
                    title="Не удалось загрузить детали"
                    details="Сервер вернул ошибку при запросе конкретной дисциплины."
                    onRetry={() => selectDiscipline(selectedDisciplineID, { forceReload: true })}
                />
            )
        }

        const markRaw = marks[String(selectedDiscipline.ID)] || marks[selectedDiscipline.ID] || ""
        const grade = getGradePresentation(markRaw, selectedDiscipline)
        const subject = detail.subject?.response?.Discipline || detail.journal?.response?.Discipline || selectedDiscipline
        const disciplineMap = detail.subject?.response?.DisciplineMap
        const submodules = detail.subject?.response?.Submodules || {}

        const isExamType = /exam|difftest|coursework/i.test(String(subject?.Type || ''))

        const examFromSub = Object.values(submodules).find(sm => {
            const t = (sm.Title || '').trim()
            return t === '' || /экзамен|exam|зачёт|аттестац|итогов/i.test(t)
        })

        const examRate = subject?.ExamRate ?? subject?.Exam?.Rate ?? disciplineMap?.Exam?.Rate ?? disciplineMap?.Final?.Rate ?? examFromSub?.Rate ?? null
        const examMax = subject?.MaxExamRate ?? subject?.Exam?.MaxRate ?? disciplineMap?.Exam?.MaxRate ?? disciplineMap?.Final?.MaxRate ?? examFromSub?.MaxRate ?? null

        return (
            <div className="grade-panel">
                <div className={`grade-main grade-${grade.tone}`}>{grade.text}</div>
                <p className="grade-caption">{grade.description}</p>
                <dl className="kv-grid">
                    <div><dt>Тип</dt><dd>{formatDisciplineType(subject?.Type)}</dd></div>
                    {isExamType && (
                        <div><dt>Баллы за экзамен</dt><dd className="mono">{examRate ?? "-"} / {examMax ?? "-"}</dd></div>
                    )}
                    <div><dt>Баллы</dt><dd className="mono">{subject?.Rate ?? selectedDiscipline?.Rate ?? "-"} / {subject?.MaxCurrentRate ?? selectedDiscipline?.MaxCurrentRate ?? "-"}</dd></div>
                </dl>
            </div>
        )
    }

    const renderJournalTab = () => {
        if (!selectedDiscipline) {
            return <StateEmpty title="Нет журнала" description="Данные журнала появятся после выбора дисциплины." />
        }

        if (request.detail === "loading") {
            return <StateLoading />
        }

        const journal = Array.isArray(detail.journal?.response?.Journal) ? detail.journal.response.Journal : []
        if (!journal.length) {
            return <StateEmpty title="Журнал пуст" description="Для этой дисциплины журнал не вернул записей." />
        }

        return <JournalTable journal={journal} />
    }

    const renderMapTab = () => {
        if (!selectedDiscipline) {
            return <StateEmpty title="Нет модулей" description="Данные о модулях появятся после выбора дисциплины." />
        }

        if (request.detail === "loading") {
            return <StateLoading />
        }

        const disciplineMap = detail.subject?.response?.DisciplineMap
        const submodules = detail.subject?.response?.Submodules || {}
        if (!disciplineMap?.Modules) {
            return <StateEmpty title="Модули недоступны" description="API не вернул структуру модулей для этой дисциплины." />
        }

        const subjectInfo = detail.subject?.response?.Discipline || detail.journal?.response?.Discipline || selectedDiscipline

        return <ModuleCardList subjectInfo={subjectInfo} disciplineMap={disciplineMap} submodules={submodules} />
    }

    const renderTeachersTab = () => {
        if (!selectedDiscipline) {
            return <StateEmpty title="Нет преподавателей" description="Данные о преподавателях появятся после выбора дисциплины." />
        }

        if (request.detail === "loading") {
            return <StateLoading />
        }

        if (!mergedTeachers.length) {
            return <StateEmpty title="Список пуст" description="Преподаватели для выбранной дисциплины не найдены." />
        }

        return (
            <div className="teacher-list">
                {mergedTeachers.map((teacher, idx) => (
                    <TeacherRow key={String(teacher.ID || teacher.TeacherID || idx)} teacher={teacher} index={idx} />
                ))}
            </div>
        )
    }

    const disciplineTabs = [
        { id: "grade", label: "Оценка" },
        { id: "journal", label: "Журнал" },
        { id: "map", label: "Модули" },
        { id: "teachers", label: "Преподаватели" }
    ]

    return (
        <section className={`view ${active ? "view-active" : ""}`.trim()} aria-label="Панель оценок">
            <header className="topbar">
                <div>
                    <p className="kicker">БРС ЮФУ</p>
                    <h2>Сервис БРС</h2>
                </div>
                <div className="topbar-actions">
                    <button className="btn btn-ghost" type="button" onClick={handleRefresh}>Обновить</button>
                    <button className="btn btn-danger" type="button" onClick={handleLogout}>Выйти</button>
                </div>
            </header>

            <section className="toolbar card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="main-nav" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        className={`btn ${mainNav === "disciplines" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => {
                            setMainNav("disciplines")
                            setMobileView("list")
                        }}
                    >
                        Дисциплины
                    </button>
                    <button
                        type="button"
                        className={`btn ${mainNav === "events" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => {
                            setMainNav("events")
                            setMobileView("list")
                        }}
                    >
                        История событий
                    </button>
                    <button
                        type="button"
                        className={`btn btn-schedule-nav ${mainNav === "schedule" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => {
                            setMainNav("schedule")
                            setMobileView("list")
                        }}
                    >
                        Расписание
                    </button>
                </div>

                <div className="main-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label className="field field-inline" style={{ margin: 0 }}>
                        <span>Семестр</span>
                        <select className="input select" value={currentSemesterID} onChange={handleSemesterChange}>
                            {semesters.length === 0 ? (
                                <option value="">{request.semesters === "loading" ? "Загрузка..." : "Семестры не найдены"}</option>
                            ) : (
                                semesters.map((semester) => (
                                    <option key={String(semester.ID)} value={String(semester.ID)}>
                                        {formatSemesterLabel(semester)}
                                    </option>
                                ))
                            )}
                        </select>
                    </label>
                    {lastMainLoadError && (
                        <button className="btn btn-ghost" type="button" onClick={() => loadIndex(token, currentSemesterID)}>
                            Повторить запрос
                        </button>
                    )}
                </div>
            </section>

            {mainNav === "disciplines" ? (
                <main className={`dashboard-grid ${mobileView === "detail" ? "mobile-view-detail" : "mobile-view-list"}`}>
                    <section className="card panel-list">
                        <div className="panel-head">
                            <h3>Список дисциплин</h3>
                            <span className="pill">{String(disciplines.length)}</span>
                        </div>
                        <div className="panel-body">{renderDisciplines()}</div>
                    </section>

                    <section className="detail-column">
                        <article className="card panel-detail">
                            <div className="panel-head panel-head-detail">
                                <div className="panel-head-title-wrap">
                                    <button
                                        type="button"
                                        className="mobile-back-btn"
                                        onClick={handleBackToList}
                                        aria-label="Назад к списку дисциплин"
                                    >
                                        <span className="mobile-back-icon" aria-hidden="true">←</span>
                                        <span>К списку</span>
                                    </button>
                                    <h3 title={selectedDiscipline?.SubjectName}>{selectedDiscipline?.SubjectName || "Детали дисциплины"}</h3>
                                </div>
                                <span className="pill">{selectedGrade.text || "-"}</span>
                            </div>

                            <nav className="tabs" aria-label="Вкладки дисциплины">
                                {disciplineTabs.map((t) => (
                                    <button
                                        key={t.id}
                                        className={`tab ${activeTab === t.id ? "tab-active" : ""}`.trim()}
                                        type="button"
                                        onClick={() => setActiveTab(t.id)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>

                            <div className="panel-body">
                                <section className={`tab-panel ${activeTab === "grade" ? "tab-panel-active" : ""}`.trim()}>{renderGradeTab()}</section>
                                <section className={`tab-panel ${activeTab === "journal" ? "tab-panel-active" : ""}`.trim()}>{renderJournalTab()}</section>
                                <section className={`tab-panel ${activeTab === "map" ? "tab-panel-active" : ""}`.trim()}>{renderMapTab()}</section>
                                <section className={`tab-panel ${activeTab === "teachers" ? "tab-panel-active" : ""}`.trim()}>{renderTeachersTab()}</section>
                            </div>
                        </article>
                    </section>
                </main>
            ) : mainNav === "schedule" ? (
                <main className="dashboard-schedule-view">
                    <ScheduleView />
                </main>
            ) : (
                <main className="dashboard-events-view">
                    <section className="card">
                        <div className="panel-head">
                            <h3>История событий</h3>
                            <span className="pill">{String(parsedGlobalEvents.length)}</span>
                        </div>
                        <div className="panel-body">
                            {request.globalEvents === "loading" ? (
                                <StateLoading />
                            ) : request.globalEvents === "error" ? (
                                <StateError
                                    title="Не удалось загрузить историю событий"
                                    details="Ошибка при запросе /api/v0/events от сервера ЮФУ"
                                    onRetry={() => loadGlobalEvents(token, currentSemesterID)}
                                />
                            ) : (
                                <EventsTable events={parsedGlobalEvents} />
                            )}
                        </div>
                    </section>
                </main>
            )}

            <details className="card debug-card" style={{ marginTop: '1.5rem' }}>
                <summary>Debug API</summary>
                <pre>{JSON.stringify(debugLog, null, 2)}</pre>
            </details>
            <p className="footer-credit footer-credit-dashboard">romka навайбкодил</p>
        </section>
    )
}
