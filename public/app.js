const ENDPOINTS = {
    semesters: "/api/student/semester_list",
    index: "/api/student/index",
    journal: "/api/student/discipline/journal",
    subject: "/api/student/discipline/subject",
    profile: "/api/student/profile"
}

const state = {
    token: "",
    remember: false,
    semesters: [],
    currentSemesterID: "",
    disciplines: [],
    marks: {},
    teachersMap: {},
    selectedDisciplineID: "",
    detailCache: new Map(),
    profile: null,
    debugLog: {},
    request: {
        semesters: "idle",
        index: "idle",
        detail: "idle",
        profile: "idle"
    },
    lastMainLoadError: ""
}

const els = {
    loginView: document.getElementById("loginView"),
    dashboardView: document.getElementById("dashboardView"),
    tokenInput: document.getElementById("tokenInput"),
    rememberCheck: document.getElementById("rememberCheck"),
    btnPaste: document.getElementById("btnPaste"),
    btnLogin: document.getElementById("btnLogin"),
    loginStatus: document.getElementById("loginStatus"),
    btnLogout: document.getElementById("btnLogout"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnRetryMain: document.getElementById("btnRetryMain"),
    semesterSelect: document.getElementById("semesterSelect"),
    discList: document.getElementById("discList"),
    discCount: document.getElementById("discCount"),
    subjectTitle: document.getElementById("subjectTitle"),
    subjectBadge: document.getElementById("subjectBadge"),
    profileContent: document.getElementById("profileContent"),
    debugPre: document.getElementById("debugPre"),
    tabButtons: Array.from(document.querySelectorAll(".tab")),
    tabPanels: {
        grade: document.getElementById("tab-grade"),
        journal: document.getElementById("tab-journal"),
        map: document.getElementById("tab-map"),
        teachers: document.getElementById("tab-teachers")
    },
    tplLoading: document.getElementById("tplLoading"),
    tplEmpty: document.getElementById("tplEmpty")
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

function escapeHtml(value) {
    const node = document.createElement("div")
    node.textContent = String(value ?? "")
    return node.innerHTML
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

function setStatus(message, type = "") {
    els.loginStatus.textContent = message || ""
    els.loginStatus.className = "status"
    if (message) {
        els.loginStatus.classList.add("status-visible")
    }
    if (type) {
        els.loginStatus.classList.add(`status-${type}`)
    }
}

function setMainError(message) {
    state.lastMainLoadError = message
    els.btnRetryMain.hidden = !message
}

function showView(name) {
    const isLogin = name === "login"
    els.loginView.classList.toggle("view-active", isLogin)
    els.dashboardView.classList.toggle("view-active", !isLogin)
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

function buildQuery(params) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            qs.set(key, String(value))
        }
    }
    return qs.toString()
}

async function fetchJson(endpoint, params) {
    const query = buildQuery(params)
    const url = query ? `${endpoint}?${query}` : endpoint
    const { res, text, json } = await apiGet(url)

    state.debugLog[url] = json || text
    renderDebug()

    if (!res.ok) {
        const errMessage = json?.error || json?.message || `HTTP ${res.status}`
        const details = json?.details ? ` (${json.details})` : ""
        throw new Error(errMessage + details)
    }

    return json
}

function renderDebug() {
    if (!els.debugPre) return
    els.debugPre.textContent = JSON.stringify(state.debugLog, null, 2)
}

function renderLoading(container) {
    container.innerHTML = ""
    container.appendChild(els.tplLoading.content.cloneNode(true))
}

function renderEmpty(container, title, description) {
    container.innerHTML = ""
    const node = els.tplEmpty.content.cloneNode(true)
    const h4 = node.querySelector("h4")
    const p = node.querySelector("p")
    h4.textContent = title
    p.textContent = description
    container.appendChild(node)
}

function renderError(container, title, details, retryAction) {
    container.innerHTML = `
        <div class="state state-error">
            <h4>${escapeHtml(title)}</h4>
            <p>${escapeHtml(details)}</p>
            <button class="btn btn-ghost state-retry" type="button">Повторить</button>
        </div>
    `
    const btn = container.querySelector(".state-retry")
    if (btn) {
        btn.addEventListener("click", retryAction)
    }
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
            description: "Процент освоения дисциплины",
            percent
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
    return map[value] || { text: "-", tone: "muted", description: "Не определено", percent: null }
}

function renderSemesters() {
    if (!state.semesters.length) {
        els.semesterSelect.innerHTML = `<option value="">Семестры не найдены</option>`
        return
    }

    els.semesterSelect.innerHTML = state.semesters.map((semester) => {
        const selected = String(semester.ID) === String(state.currentSemesterID) ? "selected" : ""
        return `<option value="${escapeHtml(semester.ID)}" ${selected}>${escapeHtml(formatSemesterLabel(semester))}</option>`
    }).join("")
}

function renderDisciplines() {
    els.discCount.textContent = String(state.disciplines.length)

    if (state.request.index === "loading") {
        renderLoading(els.discList)
        return
    }

    if (!state.disciplines.length) {
        renderEmpty(els.discList, "Нет дисциплин", "В выбранном семестре не найдено дисциплин.")
        return
    }

    els.discList.innerHTML = state.disciplines.map((discipline, index) => {
        const id = String(discipline.ID)
        const mark = state.marks[id] || state.marks[discipline.ID] || ""
        const grade = getGradePresentation(mark, discipline)
        const active = state.selectedDisciplineID === id ? "disc-item-active" : ""
        const teachers = getIndexTeachersForDiscipline(id)
        const teachersPreview = teachers
            .slice(0, 2)
            .map((teacher) => formatTeacherShortName(teacher))
            .join(" · ")
        const teachersOverflow = teachers.length > 2 ? ` +${teachers.length - 2}` : ""
        const points = discipline.MaxCurrentRate
            ? `${discipline.Rate || 0} / ${discipline.MaxCurrentRate}`
            : `${discipline.Rate || 0}`

        return `
            <button class="disc-item ${active}" data-id="${escapeHtml(id)}" type="button" style="--delay:${index * 50}ms">
                <div class="disc-item-head">
                    <span class="disc-title">${escapeHtml(discipline.SubjectName || "Без названия")}</span>
                    <span class="grade-chip grade-${grade.tone}">${escapeHtml(grade.text)}</span>
                </div>
                <div class="disc-item-meta">
                    <span>${escapeHtml(formatDisciplineType(discipline.Type))}</span>
                    <span class="mono">${escapeHtml(points)} б.</span>
                </div>
                <div class="disc-item-teachers" title="${escapeHtml(teachers.map((teacher) => formatTeacherShortName(teacher)).join(", ") || "Преподаватели не указаны")}">
                    ${escapeHtml(teachersPreview || "Преподаватели не указаны")}${escapeHtml(teachersOverflow)}
                </div>
            </button>
        `
    }).join("")

    els.discList.querySelectorAll(".disc-item").forEach((button) => {
        button.addEventListener("click", () => {
            selectDiscipline(button.dataset.id)
        })
    })
}

function getIndexTeachersForDiscipline(disciplineID) {
    const value = state.teachersMap[String(disciplineID)] || state.teachersMap[disciplineID]
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === "object") return Object.values(value)
    return []
}

function renderDetailPanels() {
    const selected = state.disciplines.find((discipline) => String(discipline.ID) === String(state.selectedDisciplineID))
    if (!selected) {
        els.subjectTitle.textContent = "Детали дисциплины"
        els.subjectBadge.textContent = "-"
        renderEmpty(els.tabPanels.grade, "Выберите дисциплину", "Откройте дисциплину в списке слева.")
        renderEmpty(els.tabPanels.journal, "Нет журнала", "Данные журнала появятся после выбора дисциплины.")
        renderEmpty(els.tabPanels.map, "Нет модулей", "Данные о модулях появятся после выбора дисциплины.")
        renderEmpty(els.tabPanels.teachers, "Нет преподавателей", "Данные о преподавателях появятся после выбора дисциплины.")
        return
    }

    const markRaw = state.marks[String(selected.ID)] || state.marks[selected.ID] || ""
    const grade = getGradePresentation(markRaw, selected)

    els.subjectTitle.textContent = selected.SubjectName || "Дисциплина"
    els.subjectBadge.textContent = grade.text

    if (state.request.detail === "loading") {
        renderLoading(els.tabPanels.grade)
        renderLoading(els.tabPanels.journal)
        renderLoading(els.tabPanels.map)
        renderLoading(els.tabPanels.teachers)
        return
    }

    if (state.request.detail === "error") {
        renderError(
            els.tabPanels.grade,
            "Не удалось загрузить детали",
            "Сервер вернул ошибку при запросе конкретной дисциплины.",
            () => selectDiscipline(state.selectedDisciplineID, { forceReload: true })
        )
        renderEmpty(els.tabPanels.journal, "Нет журнала", "Повторите запрос для загрузки журнала.")
        renderEmpty(els.tabPanels.map, "Нет модулей", "Повторите запрос для загрузки структуры модуля.")
        renderEmpty(els.tabPanels.teachers, "Нет преподавателей", "Повторите запрос для загрузки преподавателей.")
        return
    }

    const cacheKey = `${state.currentSemesterID}:${state.selectedDisciplineID}`
    const detail = state.detailCache.get(cacheKey) || { journal: null, subject: null }

    renderGradeTab(selected, grade, detail)
    renderJournalTab(detail)
    renderMapTab(detail)
    renderTeachersTab(selected, detail)
}

function renderGradeTab(discipline, grade, detail) {
    const subject = detail.subject?.response?.Discipline || detail.journal?.response?.Discipline || discipline
    const maxRate = subject?.MaxCurrentRate ?? discipline?.MaxCurrentRate ?? "-"
    const rate = subject?.Rate ?? discipline?.Rate ?? "-"

    els.tabPanels.grade.innerHTML = `
        <div class="grade-panel">
            <div class="grade-main grade-${grade.tone}">${escapeHtml(grade.text)}</div>
            <p class="grade-caption">${escapeHtml(grade.description)}</p>
            <dl class="kv-grid">
                <div><dt>Тип</dt><dd>${escapeHtml(formatDisciplineType(subject?.Type))}</dd></div>
                <div><dt>Семестр</dt><dd>${escapeHtml(state.currentSemesterID || "-")}</dd></div>
                <div><dt>Баллы</dt><dd class="mono">${escapeHtml(rate)} / ${escapeHtml(maxRate)}</dd></div>
                <div><dt>ID дисциплины</dt><dd class="mono">${escapeHtml(subject?.ID || discipline?.ID || "-")}</dd></div>
            </dl>
        </div>
    `
}

function renderJournalTab(detail) {
    const journal = Array.isArray(detail.journal?.response?.Journal) ? detail.journal.response.Journal : []
    if (!journal.length) {
        renderEmpty(els.tabPanels.journal, "Журнал пуст", "Для этой дисциплины журнал не вернул записей.")
        return
    }

    els.tabPanels.journal.innerHTML = `
        <div class="table-wrap">
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
                    ${journal.map((entry) => {
                        const date = entry.LessonDate ? new Date(entry.LessonDate).toLocaleDateString("ru-RU") : "-"
                        const mark = entry.Mark ?? "-"
                        const attendedText = entry.Attended ? "Да" : "Нет"
                        const attendedClass = entry.Attended ? "attended" : "missed"
                        return `
                            <tr>
                                <td>${escapeHtml(date)}</td>
                                <td>${escapeHtml(entry.LessonType || "-")}</td>
                                <td>${escapeHtml(entry.Topic || "-")}</td>
                                <td class="mono">${escapeHtml(mark)}</td>
                                <td class="${attendedClass}">${attendedText}</td>
                            </tr>
                        `
                    }).join("")}
                </tbody>
            </table>
        </div>
    `
}

function renderMapTab(detail) {
    const disciplineMap = detail.subject?.response?.DisciplineMap
    const submodules = detail.subject?.response?.Submodules || {}

    if (!disciplineMap?.Modules) {
        renderEmpty(els.tabPanels.map, "Модули недоступны", "API не вернул структуру модулей для этой дисциплины.")
        return
    }

    const modules = Object.values(disciplineMap.Modules)
    els.tabPanels.map.innerHTML = `
        <div class="module-list">
            ${modules.map((module) => {
                const submoduleRows = (module.Submodules || []).map((submoduleID) => {
                    const info = submodules[submoduleID] || {}
                    return `
                        <li>
                            <span>${escapeHtml(info.Title || `Подмодуль ${submoduleID}`)}</span>
                            <span class="mono">${escapeHtml(info.Rate ?? "-")} / ${escapeHtml(info.MaxRate ?? "-")}</span>
                        </li>
                    `
                }).join("")

                return `
                    <article class="module-card">
                        <header>
                            <h4>${escapeHtml(module.Title || "Модуль")}</h4>
                        </header>
                        <ul>${submoduleRows || "<li><span>Нет подмодулей</span><span class=\"mono\">-</span></li>"}</ul>
                    </article>
                `
            }).join("")}
        </div>
    `
}

function renderTeachersTab(discipline, detail) {
    const fromJournal = Array.isArray(detail.journal?.response?.Teachers) ? detail.journal.response.Teachers : []
    const fromSubject = Array.isArray(detail.subject?.response?.Teachers) ? detail.subject.response.Teachers : []
    const fromIndex = getIndexTeachersForDiscipline(discipline.ID)

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

    if (!uniq.length) {
        renderEmpty(els.tabPanels.teachers, "Список пуст", "Преподаватели для выбранной дисциплины не найдены.")
        return
    }

    els.tabPanels.teachers.innerHTML = `
        <div class="teacher-list">
            ${uniq.map((teacher) => {
                const fullName = teacher.Name
                    || `${teacher.LastName || ""} ${teacher.FirstName || ""} ${teacher.SecondName || ""}`.trim()
                    || "Без имени"
                const role = teacher.JobPositionName || "Преподаватель"
                const initials = `${(teacher.LastName || "").slice(0, 1)}${(teacher.FirstName || "").slice(0, 1)}`.toUpperCase() || "PR"
                return `
                    <article class="teacher-row">
                        <span class="avatar">${escapeHtml(initials)}</span>
                        <div>
                            <h4>${escapeHtml(fullName)}</h4>
                            <p>${escapeHtml(role)}</p>
                        </div>
                    </article>
                `
            }).join("")}
        </div>
    `
}

function renderProfile() {
    if (state.request.profile === "loading") {
        renderLoading(els.profileContent)
        return
    }

    if (state.request.profile === "error") {
        renderError(
            els.profileContent,
            "Профиль недоступен",
            "Эндпоинт профиля недоступен или вернул ошибку.",
            loadProfile
        )
        return
    }

    const profile = state.profile?.response || state.profile || null
    if (!profile) {
        renderEmpty(els.profileContent, "Нет данных", "Профиль студента не вернулся в API ответе.")
        return
    }

    const pairs = [
        ["ФИО", profile.FullName || profile.full_name || profile.Name || "-"],
        ["Группа", profile.GroupNum || profile.group || "-"],
        ["Курс", profile.Course || profile.course || "-"],
        ["Специальность", profile.Speciality || profile.study_direction || "-"],
        ["Зачетка", profile.RecordBookID || profile.record_book_id || "-"]
    ]

    els.profileContent.innerHTML = `
        <dl class="kv-grid kv-compact">
            ${pairs.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
    `
}

function activateTab(tabName) {
    els.tabButtons.forEach((button) => {
        button.classList.toggle("tab-active", button.dataset.tab === tabName)
    })

    Object.entries(els.tabPanels).forEach(([name, panel]) => {
        panel.classList.toggle("tab-panel-active", name === tabName)
    })
}

async function loadSemesters() {
    state.request.semesters = "loading"
    try {
        const json = await fetchJson(ENDPOINTS.semesters, { token: state.token })
        const response = json?.response || {}
        const list = Array.isArray(response) ? response : Object.values(response)
        list.sort((a, b) => Number(b.ID || 0) - Number(a.ID || 0))

        state.semesters = list
        state.currentSemesterID = list[0] ? String(list[0].ID) : ""
        state.request.semesters = "success"

        renderSemesters()
    } catch (error) {
        state.request.semesters = "error"
        throw error
    }
}

async function loadIndex() {
    if (!state.currentSemesterID) {
        state.disciplines = []
        state.marks = {}
        state.teachersMap = {}
        renderDisciplines()
        renderDetailPanels()
        return
    }

    state.request.index = "loading"
    renderDisciplines()

    try {
        const json = await fetchJson(ENDPOINTS.index, {
            token: state.token,
            SemesterID: state.currentSemesterID
        })
        const response = json?.response || {}
        state.disciplines = Array.isArray(response.Disciplines) ? response.Disciplines : []
        state.marks = response.Marks || {}
        state.teachersMap = response.Teachers || {}

        if (state.selectedDisciplineID) {
            const stillExists = state.disciplines.some((discipline) => String(discipline.ID) === String(state.selectedDisciplineID))
            if (!stillExists) {
                state.selectedDisciplineID = ""
            }
        }

        state.request.index = "success"
        setMainError("")
    } catch (error) {
        state.request.index = "error"
        setMainError(error.message)
        throw error
    } finally {
        renderDisciplines()
        renderDetailPanels()
    }
}

async function loadProfile() {
    state.request.profile = "loading"
    renderProfile()

    try {
        state.profile = await fetchJson(ENDPOINTS.profile, { token: state.token })
        state.request.profile = "success"
    } catch {
        state.request.profile = "error"
    }

    renderProfile()
}

async function selectDiscipline(disciplineID, options = {}) {
    state.selectedDisciplineID = String(disciplineID)
    renderDisciplines()

    const cacheKey = `${state.currentSemesterID}:${state.selectedDisciplineID}`
    if (!options.forceReload && state.detailCache.has(cacheKey)) {
        state.request.detail = "success"
        renderDetailPanels()
        return
    }

    state.request.detail = "loading"
    renderDetailPanels()

    try {
        const [journalResult, subjectResult] = await Promise.all([
            fetchJson(ENDPOINTS.journal, { token: state.token, id: state.selectedDisciplineID }),
            fetchJson(ENDPOINTS.subject, { token: state.token, id: state.selectedDisciplineID }).catch(() => null)
        ])

        state.detailCache.set(cacheKey, {
            journal: journalResult,
            subject: subjectResult
        })
        state.request.detail = "success"
    } catch {
        state.request.detail = "error"
    }

    renderDetailPanels()
}

async function loadDashboardData() {
    setMainError("")
    await loadSemesters()
    await Promise.all([loadIndex(), loadProfile()])
}

async function handleLogin() {
    const token = els.tokenInput.value.trim()
    const remember = els.rememberCheck.checked

    if (!isLikelyToken(token)) {
        setStatus("Введите валидный токен (обычно 36-40 символов).", "error")
        return
    }

    state.token = token
    state.remember = remember
    setStoredAuth(token, remember)
    setStatus("Проверка токена...", "")

    try {
        await loadDashboardData()
        showView("dashboard")
        setStatus("")
    } catch (error) {
        setStatus(`Ошибка входа: ${error.message}`, "error")
    }
}

function handleLogout() {
    clearStoredAuth()

    state.token = ""
    state.remember = false
    state.semesters = []
    state.currentSemesterID = ""
    state.disciplines = []
    state.marks = {}
    state.teachersMap = {}
    state.selectedDisciplineID = ""
    state.detailCache.clear()
    state.profile = null
    state.debugLog = {}
    state.request = {
        semesters: "idle",
        index: "idle",
        detail: "idle",
        profile: "idle"
    }

    els.tokenInput.value = ""
    els.rememberCheck.checked = false
    renderDisciplines()
    renderDetailPanels()
    renderProfile()
    renderDebug()

    showView("login")
}

async function handleRefresh() {
    try {
        await Promise.all([loadIndex(), loadProfile()])
        if (state.selectedDisciplineID) {
            await selectDiscipline(state.selectedDisciplineID, { forceReload: true })
        }
    } catch {
        return
    }
}

function bindEvents() {
    els.btnLogin.addEventListener("click", handleLogin)

    els.tokenInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            handleLogin()
        }
    })

    els.btnPaste.addEventListener("click", async () => {
        try {
            const text = await navigator.clipboard.readText()
            els.tokenInput.value = text.trim()
        } catch {
            setStatus("Браузер не дал доступ к буферу обмена.", "error")
        }
    })

    els.btnLogout.addEventListener("click", handleLogout)
    els.btnRefresh.addEventListener("click", handleRefresh)
    els.btnRetryMain.addEventListener("click", loadIndex)

    els.semesterSelect.addEventListener("change", async (event) => {
        state.currentSemesterID = event.target.value
        state.selectedDisciplineID = ""
        try {
            await loadIndex()
        } catch {
            return
        }
    })

    els.tabButtons.forEach((button) => {
        button.addEventListener("click", () => activateTab(button.dataset.tab))
    })
}

async function bootstrap() {
    bindEvents()
    activateTab("grade")
    renderDisciplines()
    renderDetailPanels()
    renderProfile()

    const storedAuth = getStoredAuth()
    if (storedAuth.remember && storedAuth.token) {
        els.tokenInput.value = storedAuth.token
        els.rememberCheck.checked = true
        state.token = storedAuth.token
        state.remember = true

        try {
            await loadDashboardData()
            showView("dashboard")
        } catch {
            showView("login")
            setStatus("Не удалось автоматически войти. Проверьте токен.", "error")
        }
    } else {
        showView("login")
    }
}

bootstrap()
