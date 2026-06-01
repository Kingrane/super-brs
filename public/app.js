import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1"
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client"
import htm from "https://esm.sh/htm@3.1.1"

const html = htm.bind(React.createElement)

const ENDPOINTS = {
    semesters: "/api/student/semester_list",
    index: "/api/student/index",
    journal: "/api/student/discipline/journal",
    subject: "/api/student/discipline/subject",
}

const INITIAL_REQUEST = {
    semesters: "idle",
    index: "idle",
    detail: "idle",
}

function getStoredAuth() {
    return {
        token: localStorage.getItem("grade_token") || "",
        remember: localStorage.getItem("grade_remember") === "1"
    }
}

function setStoredAuth(token, remember) {
    localStorage.setItem("grade_remember", remember ? "1" : "0")
    if (remember) {
        localStorage.setItem("grade_token", token)
    } else {
        localStorage.removeItem("grade_token")
    }
}

function clearStoredAuth() {
    localStorage.removeItem("grade_token")
    localStorage.removeItem("grade_remember")
}

function isLikelyToken(token) {
    return /^[0-9a-z-]{16,80}$/i.test(token.trim())
}

function normalizeNumber(value) {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

function formatDisciplineType(type) {
    const key = String(type || "").toLowerCase()
    const map = {
        exam: "Экзамен",
        credit: "Зачет",
        test: "Тест",
        difftest: "Дифференцированный зачет",
        coursework: "Курсовая работа",
        practice: "Практика",
        lecture: "Лекция",
        seminar: "Семинар",
        laboratory: "Лабораторная",
        lab: "Лабораторная"
    }
    return map[key] || type || "-"
}

function formatTeacherShortName(teacher) {
    const lastName = teacher.LastName || ""
    const firstInitial = (teacher.FirstName || "").slice(0, 1)
    const secondInitial = (teacher.SecondName || "").slice(0, 1)
    const compactInitials = [firstInitial, secondInitial].filter(Boolean).map((v) => `${v}.`).join("")
    const fallback = teacher.Name || ""
    if (lastName) {
        return `${lastName} ${compactInitials}`.trim()
    }
    return fallback || "Преподаватель"
}

function buildQuery(params) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            qs.set(key, String(value))
        }
    }
    return qs.toString()
}

async function apiGet(url) {
    const res = await fetch(url)
    const text = await res.text()
    let json = null
    try {
        json = JSON.parse(text)
    } catch {
        json = null
    }

    return { res, text, json }
}

function formatSemesterLabel(semester) {
    const season = semester.Season === "spring"
        ? "Весна"
        : semester.Season === "autumn"
            ? "Осень"
            : "Семестр"
    const year = semester.CalendarYear || semester.Year || "-"
    return `${season} ${year}`
}

function getGradeToneByPercent(percent) {
    if (percent === null) return "muted"
    if (percent >= 85) return "excellent"
    if (percent >= 70) return "good"
    if (percent >= 50) return "mid"
    return "bad"
}

function getGradePresentation(mark, discipline) {
    const rate = normalizeNumber(discipline?.Rate)
    const maxRate = normalizeNumber(discipline?.MaxCurrentRate)
    const percent = rate !== null && maxRate !== null && maxRate > 0
        ? Math.round((rate / maxRate) * 100)
        : null

    if (percent !== null) {
        return {
            text: `${percent}%`,
            tone: getGradeToneByPercent(percent),
            description: "Процент освоения дисциплины"
        }
    }

    const value = String(mark || "").toUpperCase()
    const map = {
        "5": { text: "100%", tone: "excellent", description: "Оценка 5" },
        "4": { text: "80%", tone: "good", description: "Оценка 4" },
        "3": { text: "60%", tone: "mid", description: "Оценка 3" },
        "2": { text: "40%", tone: "bad", description: "Оценка 2" },
        "ECTS-A": { text: "95%", tone: "excellent", description: "ECTS-A" },
        "ECTS-B": { text: "85%", tone: "good", description: "ECTS-B" },
        "ECTS-C": { text: "75%", tone: "good", description: "ECTS-C" },
        "ECTS-D": { text: "65%", tone: "mid", description: "ECTS-D" },
        "ECTS-E": { text: "55%", tone: "mid", description: "ECTS-E" },
        "ECTS-F": { text: "35%", tone: "bad", description: "ECTS-F" },
        "PASS": { text: "100%", tone: "excellent", description: "Зачет" },
        "FAIL": { text: "40%", tone: "bad", description: "Незачет" },
        "ЗАЧЁТ": { text: "100%", tone: "excellent", description: "Зачет" },
        "НЕЗАЧЁТ": { text: "40%", tone: "bad", description: "Незачет" }
    }
    return map[value] || { text: "-", tone: "muted", description: "Не определено" }
}

function getIndexTeachersForDiscipline(teachersMap, disciplineID) {
    const value = teachersMap[String(disciplineID)] || teachersMap[disciplineID]
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === "object") return Object.values(value)
    return []
}

function StateLoading() {
    return html`
        <div className="state state-loading">
            <div className="skeleton skeleton-lg"></div>
            <div className="skeleton"></div>
            <div className="skeleton"></div>
        </div>
    `
}

function StateEmpty({ title, description }) {
    return html`
        <div className="state state-empty">
            <h4>${title}</h4>
            <p>${description}</p>
        </div>
    `
}

function StateError({ title, details, onRetry }) {
    return html`
        <div className="state state-error">
            <h4>${title}</h4>
            <p>${details}</p>
            <button className="btn btn-ghost state-retry" type="button" onClick=${onRetry}>Повторить</button>
        </div>
    `
}

function App() {
    const [tokenInput, setTokenInput] = useState("")
    const [token, setToken] = useState("")
    const [remember, setRemember] = useState(false)
    const [view, setView] = useState("login")
    const [loginStatus, setLoginStatus] = useState({ message: "", type: "" })

    const [semesters, setSemesters] = useState([])
    const [currentSemesterID, setCurrentSemesterID] = useState("")
    const [disciplines, setDisciplines] = useState([])
    const [marks, setMarks] = useState({})
    const [teachersMap, setTeachersMap] = useState({})
    const [selectedDisciplineID, setSelectedDisciplineID] = useState("")
    const [debugLog, setDebugLog] = useState({})
    const [request, setRequest] = useState(INITIAL_REQUEST)
    const [lastMainLoadError, setLastMainLoadError] = useState("")
    const [activeTab, setActiveTab] = useState("grade")

    const detailCacheRef = useRef(new Map())

    const selectedDiscipline = useMemo(
        () => disciplines.find((discipline) => String(discipline.ID) === String(selectedDisciplineID)) || null,
        [disciplines, selectedDisciplineID]
    )

    const detail = useMemo(() => {
        if (!currentSemesterID || !selectedDisciplineID) {
            return { journal: null, subject: null }
        }
        return detailCacheRef.current.get(`${currentSemesterID}:${selectedDisciplineID}`) || { journal: null, subject: null }
    }, [currentSemesterID, selectedDisciplineID, request.detail])

    const fetchJson = async (endpoint, params = {}) => {
        const query = buildQuery(params)
        const url = query ? `${endpoint}?${query}` : endpoint
        const { res, text, json } = await apiGet(url)

        setDebugLog((prev) => ({ ...prev, [url]: json || text }))

        if (!res.ok) {
            const errMessage = json?.error || json?.message || `HTTP ${res.status}`
            const details = json?.details ? ` (${json.details})` : ""
            throw new Error(errMessage + details)
        }

        return json
    }

    const loadSemesters = async (authToken) => {
        setRequest((prev) => ({ ...prev, semesters: "loading" }))
        const json = await fetchJson(ENDPOINTS.semesters, { token: authToken })
        const response = json?.response || {}
        const list = Array.isArray(response) ? response : Object.values(response)
        list.sort((a, b) => Number(b.ID || 0) - Number(a.ID || 0))

        const nextSemester = list[0] ? String(list[0].ID) : ""
        setSemesters(list)
        setCurrentSemesterID(nextSemester)
        setRequest((prev) => ({ ...prev, semesters: "success" }))
        return nextSemester
    }

    const loadIndex = async (authToken, semesterID) => {
        if (!semesterID) {
            setDisciplines([])
            setMarks({})
            setTeachersMap({})
            setRequest((prev) => ({ ...prev, index: "success" }))
            return
        }

        setRequest((prev) => ({ ...prev, index: "loading" }))
        try {
            const json = await fetchJson(ENDPOINTS.index, {
                token: authToken,
                SemesterID: semesterID
            })
            const response = json?.response || {}
            const nextDisciplines = Array.isArray(response.Disciplines) ? response.Disciplines : []
            setDisciplines(nextDisciplines)
            setMarks(response.Marks || {})
            setTeachersMap(response.Teachers || {})

            setSelectedDisciplineID((prev) => {
                if (!prev) return ""
                const stillExists = nextDisciplines.some((discipline) => String(discipline.ID) === String(prev))
                return stillExists ? prev : ""
            })

            setRequest((prev) => ({ ...prev, index: "success" }))
            setLastMainLoadError("")
        } catch (error) {
            setRequest((prev) => ({ ...prev, index: "error" }))
            setLastMainLoadError(error.message)
            throw error
        }
    }


    const selectDiscipline = async (disciplineID, options = {}) => {
        const nextID = String(disciplineID)
        setSelectedDisciplineID(nextID)

        const cacheKey = `${currentSemesterID}:${nextID}`
        if (!options.forceReload && detailCacheRef.current.has(cacheKey)) {
            setRequest((prev) => ({ ...prev, detail: "success" }))
            return
        }

        setRequest((prev) => ({ ...prev, detail: "loading" }))

        try {
            const [journalResult, subjectResult] = await Promise.all([
                fetchJson(ENDPOINTS.journal, { token, id: nextID }),
                fetchJson(ENDPOINTS.subject, { token, id: nextID }).catch(() => null)
            ])

            detailCacheRef.current.set(cacheKey, {
                journal: journalResult,
                subject: subjectResult
            })
            setRequest((prev) => ({ ...prev, detail: "success" }))
        } catch {
            setRequest((prev) => ({ ...prev, detail: "error" }))
        }
    }

    const loadDashboardData = async (authToken) => {
        setLastMainLoadError("")
        const semesterID = await loadSemesters(authToken)
        await Promise.all([loadIndex(authToken, semesterID)])
    }

    const runLogin = async (authToken, rememberFlag, isAuto = false) => {
        setToken(authToken)
        setRemember(rememberFlag)
        setStoredAuth(authToken, rememberFlag)
        if (!isAuto) {
            setLoginStatus({ message: "Проверка токена...", type: "" })
        }

        try {
            await loadDashboardData(authToken)
            setView("dashboard")
            setLoginStatus({ message: "", type: "" })
        } catch (error) {
            if (isAuto) {
                setView("login")
                setLoginStatus({ message: "Не удалось автоматически войти. Проверьте токен.", type: "error" })
                return
            }
            setLoginStatus({ message: `Ошибка входа: ${error.message}`, type: "error" })
        }
    }

    const handleLogin = async () => {
        const authToken = tokenInput.trim()
        if (!isLikelyToken(authToken)) {
            setLoginStatus({ message: "Введите валидный токен (обычно 36-40 символов).", type: "error" })
            return
        }

        await runLogin(authToken, remember)
    }

    const handleLogout = () => {
        clearStoredAuth()
        setTokenInput("")
        setToken("")
        setRemember(false)
        setSemesters([])
        setCurrentSemesterID("")
        setDisciplines([])
        setMarks({})
        setTeachersMap({})
        setSelectedDisciplineID("")

        setDebugLog({})
        detailCacheRef.current.clear()
        setRequest(INITIAL_REQUEST)
        setLastMainLoadError("")
        setActiveTab("grade")
        setLoginStatus({ message: "", type: "" })
        setView("login")
    }

    const handleRefresh = async () => {
        try {
            await Promise.all([loadIndex(token, currentSemesterID)])
            if (selectedDisciplineID) {
                await selectDiscipline(selectedDisciplineID, { forceReload: true })
            }
        } catch {
            return
        }
    }

    const handleSemesterChange = async (event) => {
        const semesterID = event.target.value
        setCurrentSemesterID(semesterID)
        setSelectedDisciplineID("")
        try {
            await loadIndex(token, semesterID)
        } catch {
            return
        }
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            setTokenInput(text.trim())
        } catch {
            setLoginStatus({ message: "Браузер не дал доступ к буферу обмена.", type: "error" })
        }
    }

    useEffect(() => {
        const storedAuth = getStoredAuth()
        if (storedAuth.remember && storedAuth.token) {
            setTokenInput(storedAuth.token)
            setRemember(true)
            runLogin(storedAuth.token, true, true)
        }
    }, [])

    const mergedTeachers = useMemo(() => {
        if (!selectedDiscipline) return []
        const fromJournal = Array.isArray(detail.journal?.response?.Teachers) ? detail.journal.response.Teachers : []
        const fromSubject = Array.isArray(detail.subject?.response?.Teachers) ? detail.subject.response.Teachers : []
        const fromIndex = getIndexTeachersForDiscipline(teachersMap, selectedDiscipline.ID)
        const merged = [...fromJournal, ...fromSubject, ...fromIndex]
        const uniq = []
        const seen = new Set()

        for (const teacher of merged) {
            const key = String(teacher.ID || teacher.TeacherID || teacher.Name || `${teacher.LastName}-${teacher.FirstName}`)
            if (!seen.has(key)) {
                seen.add(key)
                uniq.push(teacher)
            }
        }

        return uniq
    }, [detail, selectedDiscipline, teachersMap])

    const renderDisciplines = () => {
        if (request.index === "loading") {
            return html`<${StateLoading} />`
        }

        if (!disciplines.length) {
            return html`<${StateEmpty} title="Нет дисциплин" description="В выбранном семестре не найдено дисциплин." />`
        }

        return disciplines.map((discipline, index) => {
            const id = String(discipline.ID)
            const mark = marks[id] || marks[discipline.ID] || ""
            const grade = getGradePresentation(mark, discipline)
            const active = selectedDisciplineID === id ? "disc-item-active" : ""
            const teachers = getIndexTeachersForDiscipline(teachersMap, id)
            const teachersPreview = teachers.slice(0, 2).map((teacher) => formatTeacherShortName(teacher)).join(" · ")
            const teachersOverflow = teachers.length > 2 ? ` +${teachers.length - 2}` : ""
            const points = discipline.MaxCurrentRate ? `${discipline.Rate || 0} / ${discipline.MaxCurrentRate}` : `${discipline.Rate || 0}`

            return html`
                <button
                    key=${id}
                    className=${`disc-item ${active}`.trim()}
                    data-id=${id}
                    type="button"
                    style=${{ "--delay": `${index * 50}ms` }}
                    onClick=${() => selectDiscipline(id)}
                >
                    <div className="disc-item-head">
                        <span className="disc-title">${discipline.SubjectName || "Без названия"}</span>
                        <span className=${`grade-chip grade-${grade.tone}`}>${grade.text}</span>
                    </div>
                    <div className="disc-item-meta">
                        <span>${formatDisciplineType(discipline.Type)}</span>
                        <span className="mono">${points} б.</span>
                    </div>
                    <div
                        className="disc-item-teachers"
                        title=${teachers.map((teacher) => formatTeacherShortName(teacher)).join(", ") || "Преподаватели не указаны"}
                    >
                        ${teachersPreview || "Преподаватели не указаны"}${teachersOverflow}
                    </div>
                </button>
            `
        })
    }

    const renderGradeTab = () => {
        if (!selectedDiscipline) {
            return html`<${StateEmpty} title="Выберите дисциплину" description="Откройте дисциплину в списке слева." />`
        }

        if (request.detail === "loading") {
            return html`<${StateLoading} />`
        }

        if (request.detail === "error") {
            return html`
                <${StateError}
                    title="Не удалось загрузить детали"
                    details="Сервер вернул ошибку при запросе конкретной дисциплины."
                    onRetry=${() => selectDiscipline(selectedDisciplineID, { forceReload: true })}
                />
            `
        }

        const markRaw = marks[String(selectedDiscipline.ID)] || marks[selectedDiscipline.ID] || ""
        const grade = getGradePresentation(markRaw, selectedDiscipline)
        const subject = detail.subject?.response?.Discipline || detail.journal?.response?.Discipline || selectedDiscipline

        return html`
            <div className="grade-panel">
                <div className=${`grade-main grade-${grade.tone}`}>${grade.text}</div>
                <p className="grade-caption">${grade.description}</p>
                <dl className="kv-grid">
                    <div><dt>Тип</dt><dd>${formatDisciplineType(subject?.Type)}</dd></div>
                    <div><dt>Семестр</dt><dd>${currentSemesterID || "-"}</dd></div>
                    <div><dt>Баллы</dt><dd className="mono">${subject?.Rate ?? selectedDiscipline?.Rate ?? "-"} / ${subject?.MaxCurrentRate ?? selectedDiscipline?.MaxCurrentRate ?? "-"}</dd></div>
                    <div><dt>ID дисциплины</dt><dd className="mono">${subject?.ID || selectedDiscipline?.ID || "-"}</dd></div>
                </dl>
            </div>
        `
    }

    const renderJournalTab = () => {
        if (!selectedDiscipline) {
            return html`<${StateEmpty} title="Нет журнала" description="Данные журнала появятся после выбора дисциплины." />`
        }

        if (request.detail === "loading") {
            return html`<${StateLoading} />`
        }

        const journal = Array.isArray(detail.journal?.response?.Journal) ? detail.journal.response.Journal : []
        if (!journal.length) {
            return html`<${StateEmpty} title="Журнал пуст" description="Для этой дисциплины журнал не вернул записей." />`
        }

        return html`
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Тип</th>
                            <th>Тема</th>
                            <th>Баллы</th>
                            <th>Посещение</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${journal.map((entry, idx) => {
                            const date = entry.LessonDate ? new Date(entry.LessonDate).toLocaleDateString("ru-RU") : "-"
                            const mark = entry.Mark ?? "-"
                            const attendedText = entry.Attended ? "Да" : "Нет"
                            const attendedClass = entry.Attended ? "attended" : "missed"
                            return html`
                                <tr key=${`${idx}-${entry.ID || date}`}>
                                    <td>${date}</td>
                                    <td>${entry.LessonType || "-"}</td>
                                    <td>${entry.Topic || "-"}</td>
                                    <td className="mono">${mark}</td>
                                    <td className=${attendedClass}>${attendedText}</td>
                                </tr>
                            `
                        })}
                    </tbody>
                </table>
            </div>
        `
    }

    const renderMapTab = () => {
        if (!selectedDiscipline) {
            return html`<${StateEmpty} title="Нет модулей" description="Данные о модулях появятся после выбора дисциплины." />`
        }

        if (request.detail === "loading") {
            return html`<${StateLoading} />`
        }

        const disciplineMap = detail.subject?.response?.DisciplineMap
        const submodules = detail.subject?.response?.Submodules || {}
        if (!disciplineMap?.Modules) {
            return html`<${StateEmpty} title="Модули недоступны" description="API не вернул структуру модулей для этой дисциплины." />`
        }

        const modules = Object.values(disciplineMap.Modules)
        return html`
            <div className="module-list">
                ${modules.map((module, idx) => html`
                    <article key=${`${idx}-${module.Title || "module"}`} className="module-card">
                        <header>
                            <h4>${module.Title || "Модуль"}</h4>
                        </header>
                        <ul>
                            ${(module.Submodules || []).map((submoduleID) => {
                                const info = submodules[submoduleID] || {}
                                return html`
                                    <li key=${String(submoduleID)}>
                                        <span>${info.Title || `Подмодуль ${submoduleID}`}</span>
                                        <span className="mono">${info.Rate ?? "-"} / ${info.MaxRate ?? "-"}</span>
                                    </li>
                                `
                            })}
                            ${(module.Submodules || []).length === 0 && html`<li><span>Нет подмодулей</span><span className="mono">-</span></li>`}
                        </ul>
                    </article>
                `)}
            </div>
        `
    }

    const renderTeachersTab = () => {
        if (!selectedDiscipline) {
            return html`<${StateEmpty} title="Нет преподавателей" description="Данные о преподавателях появятся после выбора дисциплины." />`
        }

        if (request.detail === "loading") {
            return html`<${StateLoading} />`
        }

        if (!mergedTeachers.length) {
            return html`<${StateEmpty} title="Список пуст" description="Преподаватели для выбранной дисциплины не найдены." />`
        }

        return html`
            <div className="teacher-list">
                ${mergedTeachers.map((teacher, idx) => {
                    const fullName = teacher.Name
                        || `${teacher.LastName || ""} ${teacher.FirstName || ""} ${teacher.SecondName || ""}`.trim()
                        || "Без имени"
                    const role = teacher.JobPositionName || "Преподаватель"
                    const initials = `${(teacher.LastName || "").slice(0, 1)}${(teacher.FirstName || "").slice(0, 1)}`.toUpperCase() || "PR"
                    return html`
                        <article key=${String(teacher.ID || teacher.TeacherID || idx)} className="teacher-row">
                            <span className="avatar">${initials}</span>
                            <div>
                                <h4>${fullName}</h4>
                                <p>${role}</p>
                            </div>
                        </article>
                    `
                })}
            </div>
        `
    }

    const renderProfile = () => {
        return html`<${StateEmpty} title="Профиль недоступен" description="Функционал профиля был отключён." />`
    }

    const selectedMark = selectedDiscipline
        ? marks[String(selectedDiscipline.ID)] || marks[selectedDiscipline.ID] || ""
        : ""
    const selectedGrade = selectedDiscipline ? getGradePresentation(selectedMark, selectedDiscipline) : { text: "-" }

    return html`
        <div>
            <section className=${`view ${view === "login" ? "view-active" : ""}`.trim()} aria-labelledby="loginTitle">
                <div className="auth-layout">
                    <aside className="auth-aside">
                        <p className="kicker">Топ дс брс</p>
                        <h1 id="loginTitle">Сервис БРС ЮФУ</h1>
                        <p className="lead">Сильный человек это не тот кто поднимает тяжести или управляет компанией, а тот кто получил 60 баллов по непре</p>
                        <a className="link-inline" target="_blank" rel="noopener noreferrer" href="https://grade.sfedu.ru/sign?goal=/student/authtokenget">
                            Получить токен доступа
                        </a>
                    </aside>

                    <div className="auth-card" aria-live="polite">
                        <label className="field">
                            <span>Токен</span>
                            <input
                                className="input mono"
                                type="text"
                                placeholder="40 символов hex"
                                maxLength="40"
                                autoComplete="off"
                                value=${tokenInput}
                                onInput=${(event) => setTokenInput(event.target.value)}
                                onKeyDown=${(event) => event.key === "Enter" && handleLogin()}
                            />
                        </label>

                        <div className="auth-actions-row">
                            <label className="check">
                                <input
                                    type="checkbox"
                                    checked=${remember}
                                    onChange=${(event) => setRemember(event.target.checked)}
                                />
                                <span>Запомнить на этом устройстве</span>
                            </label>
                            <button className="btn btn-ghost" type="button" onClick=${handlePaste}>Вставить</button>
                        </div>

                        <div className="auth-buttons">
                            <button className="btn btn-primary" type="button" onClick=${handleLogin}>Войти</button>
                        </div>

                        <p className=${`status ${loginStatus.message ? "status-visible" : ""} ${loginStatus.type ? `status-${loginStatus.type}` : ""}`.trim()} role="status">
                            ${loginStatus.message}
                        </p>
                    </div>
                </div>
            </section>

            <section className=${`view ${view === "dashboard" ? "view-active" : ""}`.trim()} aria-label="Панель оценок">
                <header className="topbar">
                    <div>
                        <p className="kicker">БРС ЮФУ</p>
                        <h2>Мои дисциплины</h2>
                    </div>
                    <div className="topbar-actions">
                        <button className="btn btn-ghost" type="button" onClick=${handleRefresh}>Обновить</button>
                        <button className="btn btn-danger" type="button" onClick=${handleLogout}>Выйти</button>
                    </div>
                </header>

                <section className="toolbar card">
                    <label className="field field-inline">
                        <span>Семестр</span>
                        <select className="input select" value=${currentSemesterID} onChange=${handleSemesterChange}>
                            ${semesters.length === 0
                                ? html`<option value="">${request.semesters === "loading" ? "Загрузка..." : "Семестры не найдены"}</option>`
                                : semesters.map((semester) => html`
                                    <option key=${String(semester.ID)} value=${String(semester.ID)}>
                                        ${formatSemesterLabel(semester)}
                                    </option>
                                `)}
                        </select>
                    </label>
                    <div className="toolbar-actions">
                        <button className="btn btn-ghost" type="button" hidden=${!lastMainLoadError} onClick=${() => loadIndex(token, currentSemesterID)}>
                            Повторить запрос
                        </button>
                    </div>
                </section>

                <main className="dashboard-grid">
                    <section className="card panel-list">
                        <div className="panel-head">
                            <h3>Список дисциплин</h3>
                            <span className="pill">${String(disciplines.length)}</span>
                        </div>
                        <div className="panel-body">${renderDisciplines()}</div>
                    </section>

                    <section className="detail-column">
                        <article className="card panel-detail">
                            <div className="panel-head">
                                <h3>${selectedDiscipline?.SubjectName || "Детали дисциплины"}</h3>
                                <span className="pill">${selectedGrade.text || "-"}</span>
                            </div>

                            <nav className="tabs" aria-label="Вкладки дисциплины">
                                ${["grade", "journal", "map", "teachers"].map((tab) => html`
                                    <button
                                        key=${tab}
                                        className=${`tab ${activeTab === tab ? "tab-active" : ""}`.trim()}
                                        type="button"
                                        onClick=${() => setActiveTab(tab)}
                                    >
                                        ${tab === "grade" ? "Оценка" : tab === "journal" ? "Журнал" : tab === "map" ? "Модули" : "Преподаватели"}
                                    </button>
                                `)}
                            </nav>

                            <div className="panel-body">
                                <section className=${`tab-panel ${activeTab === "grade" ? "tab-panel-active" : ""}`.trim()}>${renderGradeTab()}</section>
                                <section className=${`tab-panel ${activeTab === "journal" ? "tab-panel-active" : ""}`.trim()}>${renderJournalTab()}</section>
                                <section className=${`tab-panel ${activeTab === "map" ? "tab-panel-active" : ""}`.trim()}>${renderMapTab()}</section>
                                <section className=${`tab-panel ${activeTab === "teachers" ? "tab-panel-active" : ""}`.trim()}>${renderTeachersTab()}</section>
                            </div>
                        </article>


                    </section>
                </main>

                <details className="card debug-card">
                    <summary>Debug API</summary>
                    <pre>${JSON.stringify(debugLog, null, 2)}</pre>
                </details>
            </section>
        </div>
    `
}

createRoot(document.getElementById("app")).render(html`<${App} />`)
