// Academic Grade Viewer - Main Application

const state = {
    token: '',
    currentSemester: null,
    semesters: [],
    disciplines: [],
    marks: {},
    teachers: {},
    selectedDiscipline: null,
    currentData: null,
    activeTab: 'grade'
}

// DOM Elements
const els = {
    // Screens
    loginScreen: document.getElementById('loginScreen'),
    appScreen: document.getElementById('appScreen'),
    
    // Login
    tokenInput: document.getElementById('tokenInput'),
    rememberCheck: document.getElementById('rememberCheck'),
    btnLogin: document.getElementById('btnLogin'),
    btnPaste: document.getElementById('btnPaste'),
    loginStatus: document.getElementById('loginStatus'),
    
    // App
    btnLogout: document.getElementById('btnLogout'),
    btnRefresh: document.getElementById('btnRefresh'),
    semesterSelect: document.getElementById('semesterSelect'),
    discList: document.getElementById('discList'),
    
    // Detail panel
    tabButtons: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Content areas
    gradeContent: document.getElementById('gradeContent'),
    journalContent: document.getElementById('journalContent'),
    teachersContent: document.getElementById('teachersContent'),
    
    // Debug
    debugPre: document.getElementById('debugPre')
}

// Utility functions
function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}

function setStatus(element, message, type = '') {
    element.textContent = message
    element.className = 'status visible'
    if (type) {
        element.classList.add(type)
    }
    
    if (!message) {
        element.classList.remove('visible')
    }
}

function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

function translateType(type) {
    const map = {
        'exam': 'экзамен',
        'credit': 'зачёт',
        'test': 'тест',
        'difftest': 'диф. зачёт',
        'coursework': 'курсовая',
        'practice': 'практика'
    }
    return map[type?.toLowerCase()] || type || ''
}

function getGradeClass(mark) {
    if (!mark) return 'grade-undefined'
    const grade = mark.toUpperCase()
    if (grade.includes('A')) return 'grade-a'
    if (grade.includes('B')) return 'grade-b'
    if (grade.includes('C')) return 'grade-c'
    if (grade.includes('D')) return 'grade-d'
    if (grade.includes('E')) return 'grade-e'
    if (grade.includes('F')) return 'grade-f'
    return 'grade-undefined'
}

function formatMark(mark) {
    if (!mark) return '—'
    const grade = mark.toUpperCase()
    const map = {
        'ECTS-A': 'A',
        'ECTS-B': 'B',
        'ECTS-C': 'C',
        'ECTS-D': 'D',
        'ECTS-E': 'E',
        'ECTS-F': 'F',
        'UNDEFINED': '—'
    }
    return map[grade] || mark
}

function getFullMarkText(mark) {
    if (!mark) return 'Не определено'
    const grade = mark.toUpperCase()
    const map = {
        'ECTS-A': 'A (отлично)',
        'ECTS-B': 'B (хорошо)',
        'ECTS-C': 'C (хорошо)',
        'ECTS-D': 'D (удовлетворительно)',
        'ECTS-E': 'E (удовлетворительно)',
        'ECTS-F': 'F (неудовлетворительно)',
        'UNDEFINED': 'Не определено'
    }
    return map[grade] || mark
}

// Storage functions
function storageGet() {
    return {
        token: localStorage.getItem('grade_token') || '',
        remember: localStorage.getItem('grade_remember') === '1'
    }
}

function storageSet(token, remember) {
    localStorage.setItem('grade_remember', remember ? '1' : '0')
    if (remember) {
        localStorage.setItem('grade_token', token)
    } else {
        localStorage.removeItem('grade_token')
    }
}

function storageClear() {
    localStorage.removeItem('grade_token')
    localStorage.removeItem('grade_remember')
}

// API functions
async function apiGet(path) {
    const res = await fetch(path)
    const text = await res.text()
    let json = null
    try {
        json = JSON.parse(text)
    } catch {}
    return { res, text, json }
}

// Screen management
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    document.getElementById(screenName).classList.add('active')
}

// Login functions
async function handleLogin() {
    const token = els.tokenInput.value.trim()
    const remember = els.rememberCheck.checked
    
    if (!token || !/^[0-9a-f]{40}$/i.test(token)) {
        setStatus(els.loginStatus, 'Введите корректный токен (40 символов hex)', 'error')
        return
    }
    
    state.token = token
    storageSet(token, remember)
    
    try {
        setStatus(els.loginStatus, 'Проверка...', '')
        await loadSemesters()
        showScreen('appScreen')
        setStatus(els.loginStatus, '', '')
    } catch (e) {
        setStatus(els.loginStatus, 'Ошибка: ' + e.message, 'error')
    }
}

function handleLogout() {
    state.token = ''
    state.currentSemester = null
    state.semesters = []
    state.disciplines = []
    state.selectedDiscipline = null
    state.currentData = null
    
    els.tokenInput.value = ''
    els.rememberCheck.checked = false
    els.semesterSelect.innerHTML = '<option value="">Загрузка...</option>'
    els.discList.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                </svg>
            </div>
            <h3>Выберите семестр</h3>
            <p>Данные загрузятся автоматически</p>
        </div>
    `
    
    clearDetailPanel()
    showScreen('loginScreen')
}

async function handlePaste() {
    try {
        const text = await navigator.clipboard.readText()
        els.tokenInput.value = text.trim()
    } catch (e) {
        console.error('Failed to paste:', e)
    }
}

// Data loading
async function loadSemesters() {
    const { json } = await apiGet('/api/student/semester_list?token=' + encodeURIComponent(state.token))
    const map = json?.response || {}
    const list = Object.values(map).sort((a, b) => (b.ID ?? 0) - (a.ID ?? 0))
    
    state.semesters = list
    
    els.semesterSelect.innerHTML = list.map(s => {
        const season = s.Season === 'spring' ? 'Весна' : s.Season === 'autumn' ? 'Осень' : ''
        const year = s.CalendarYear || s.Year
        return `<option value="${s.ID}">${season} ${year}</option>`
    }).join('')
    
    if (list.length > 0) {
        state.currentSemester = list[0].ID
        els.semesterSelect.value = state.currentSemester
        await loadIndex()
    }
}

async function loadIndex() {
    const semesterID = els.semesterSelect.value
    const qs = new URLSearchParams({ token: state.token })
    if (semesterID) qs.set('SemesterID', semesterID)
    
    const { json } = await apiGet('/api/student/index?' + qs.toString())
    const data = json?.response
    
    if (!data) {
        throw new Error('Не удалось загрузить данные')
    }
    
    state.currentData = data
    state.marks = data.Marks || {}
    state.teachers = data.Teachers || {}
    state.disciplines = data.Disciplines || []
    
    renderDisciplines()
}

async function loadDisciplineDetails(disciplineId) {
    try {
        showLoading()
        
        const { json } = await apiGet(
            `/api/student/discipline/journal?token=${encodeURIComponent(state.token)}&id=${encodeURIComponent(disciplineId)}`
        )
        
        const data = json?.response || {}
        renderDetailPanel(data)
        
        if (els.debugPre) {
            els.debugPre.textContent = JSON.stringify(data, null, 2)
        }
    } catch (e) {
        console.error('Failed to load discipline:', e)
    } finally {
        hideLoading()
    }
}

// Rendering
function renderDisciplines() {
    if (!state.disciplines.length) {
        els.discList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                    </svg>
                </div>
                <h3>Нет дисциплин</h3>
                <p>В этом семестре нет доступных дисциплин</p>
            </div>
        `
        return
    }
    
    els.discList.innerHTML = state.disciplines.map((d, index) => {
        const id = d.ID
        const mark = state.marks[String(id)] || state.marks[id] || ''
        const gradeClass = getGradeClass(mark)
        const rate = d.Rate ?? '-'
        const maxRate = d.MaxCurrentRate ?? '-'
        const isActive = state.selectedDiscipline === id
        
        return `
            <div class="disc-item ${isActive ? 'active' : ''}" data-id="${id}" style="animation: fadeIn 0.3s ease ${index * 0.05}s both">
                <div class="disc-header">
                    <div class="disc-name">${escapeHtml(d.SubjectName || 'Без названия')}</div>
                    ${mark ? `<span class="disc-grade ${gradeClass}">${formatMark(mark)}</span>` : ''}
                </div>
                <div class="disc-meta">
                    <span class="disc-type">${translateType(d.Type)}</span>
                    <span class="disc-points">${rate}${maxRate !== '-' ? ' / ' + maxRate : ''} баллов</span>
                </div>
            </div>
        `
    }).join('')
    
    // Add click handlers
    els.discList.querySelectorAll('.disc-item').forEach(item => {
        item.addEventListener('click', () => selectDiscipline(item.dataset.id))
    })
}

function selectDiscipline(id) {
    state.selectedDiscipline = id
    
    // Update active state
    els.discList.querySelectorAll('.disc-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === id)
    })
    
    loadDisciplineDetails(id)
}

function renderDetailPanel(data) {
    const discipline = data.Discipline || {}
    const mark = state.marks[state.selectedDiscipline] || state.marks[String(state.selectedDiscipline)] || ''
    
    // Grade tab
    renderGradeTab(data, mark)
    
    // Journal tab
    renderJournalTab(data)
    
    // Teachers tab
    renderTeachersTab(data)
}

function renderGradeTab(data, mark) {
    const discipline = data.Discipline || {}
    const gradeClass = getGradeClass(mark)
    const rate = discipline.Rate ?? '-'
    const maxRate = discipline.MaxCurrentRate ?? '-'
    
    els.gradeContent.innerHTML = `
        <div class="grade-display">
            <div class="grade-big ${gradeClass}">${formatMark(mark)}</div>
            <div class="grade-label">${translateType(discipline.Type)}</div>
            
            <div class="grade-details">
                <div class="info-row">
                    <span class="info-label">Дисциплина</span>
                    <span class="info-value">${escapeHtml(discipline.SubjectName || '—')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Тип</span>
                    <span class="info-value">${translateType(discipline.Type)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Набрано баллов</span>
                    <span class="info-value">${rate}${maxRate !== '-' ? ' / ' + maxRate : ''}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Оценка</span>
                    <span class="info-value">${getFullMarkText(mark)}</span>
                </div>
            </div>
        </div>
    `
}

function renderJournalTab(data) {
    const journal = Array.isArray(data.Journal) ? data.Journal : []
    
    if (!journal.length) {
        els.journalContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                </div>
                <h3>Нет данных</h3>
                <p>Информация о посещениях недоступна</p>
            </div>
        `
        return
    }
    
    els.journalContent.innerHTML = `
        <table class="journal-table">
            <thead>
                <tr>
                    <th>Дата</th>
                    <th>Тип</th>
                    <th>Баллы</th>
                    <th>Статус</th>
                </tr>
            </thead>
            <tbody>
                ${journal.map(j => `
                    <tr>
                        <td>${formatDate(j.LessonDate)}</td>
                        <td>${escapeHtml(j.LessonType || '—')}</td>
                        <td>${j.Mark ?? '—'}</td>
                        <td class="${j.Attended ? 'attended' : 'missed'}">
                            ${j.Attended ? 'Присутствовал' : 'Отсутствовал'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `
}

function renderTeachersTab(data) {
    const teachers = Array.isArray(data.Teachers) ? data.Teachers : []
    
    if (!teachers.length) {
        els.teachersContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>
                <h3>Нет данных</h3>
                <p>Информация о преподавателях недоступна</p>
            </div>
        `
        return
    }
    
    els.teachersContent.innerHTML = `
        <div class="teacher-list">
            ${teachers.map(t => {
                const initials = ((t.FirstName || '')[0] || '') + ((t.LastName || '')[0] || '')
                const fullName = t.Name || `${t.LastName} ${t.FirstName} ${t.SecondName || ''}`.trim()
                return `
                    <div class="teacher-item">
                        <div class="teacher-avatar">${initials}</div>
                        <div class="teacher-info">
                            <div class="teacher-name">${escapeHtml(fullName)}</div>
                            <div class="teacher-position">${escapeHtml(t.JobPositionName || '')}</div>
                        </div>
                        ${t.IsAuthor ? '<span class="teacher-badge">Автор</span>' : ''}
                    </div>
                `
            }).join('')}
        </div>
    `
}

function clearDetailPanel() {
    els.gradeContent.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h3>Выберите дисциплину</h3>
            <p>Нажмите на дисциплину слева, чтобы увидеть подробности</p>
        </div>
    `
    
    els.journalContent.innerHTML = els.gradeContent.innerHTML
    els.teachersContent.innerHTML = els.gradeContent.innerHTML
}

function showLoading() {
    const content = document.querySelector('.tab-content.active')
    if (content) {
        const loading = document.createElement('div')
        loading.className = 'loading-overlay'
        loading.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">Загрузка...</div>
        `
        content.appendChild(loading)
    }
}

function hideLoading() {
    document.querySelectorAll('.loading-overlay').forEach(el => el.remove())
}

// Event listeners
function init() {
    // Check for saved token
    const saved = storageGet()
    if (saved.token && saved.remember) {
        els.tokenInput.value = saved.token
        els.rememberCheck.checked = true
    }
    
    // Login events
    els.btnLogin.addEventListener('click', handleLogin)
    els.btnPaste.addEventListener('click', handlePaste)
    els.tokenInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin()
    })
    
    // App events
    els.btnLogout.addEventListener('click', handleLogout)
    els.btnRefresh.addEventListener('click', loadIndex)
    els.semesterSelect.addEventListener('change', loadIndex)
    
    // Tab switching
    els.tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab
            
            // Update active tab
            els.tabButtons.forEach(t => t.classList.remove('active'))
            els.tabContents.forEach(c => c.classList.remove('active'))
            
            tab.classList.add('active')
            document.getElementById('tab-' + tabName).classList.add('active')
            
            state.activeTab = tabName
        })
    })
}

// Initialize app
init()
