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
    activeTab: 'grade',
    isMobile: window.innerWidth <= 640
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
    
    // Detail panel (desktop)
    gradeContent: document.getElementById('gradeContent'),
    journalContent: document.getElementById('journalContent'),
    teachersContent: document.getElementById('teachersContent'),
    
    // Mobile modal
    mobileModal: document.getElementById('mobileModal'),
    modalTitle: document.getElementById('modalTitle'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    modalGradeContent: document.getElementById('modalGradeContent'),
    modalJournalContent: document.getElementById('modalJournalContent'),
    modalTeachersContent: document.getElementById('modalTeachersContent'),
    
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

// Russian grade system
function getGradeInfo(mark) {
    if (!mark) return { class: 'grade-undefined', text: '—', numeric: null }
    
    const grade = mark.toUpperCase()
    
    // Direct numeric grades
    if (grade === '5') return { class: 'grade-5', text: '5', numeric: 5 }
    if (grade === '4') return { class: 'grade-4', text: '4', numeric: 4 }
    if (grade === '3') return { class: 'grade-3', text: '3', numeric: 3 }
    if (grade === '2') return { class: 'grade-2', text: '2', numeric: 2 }
    
    // ECTS to Russian
    if (grade === 'ECTS-A') return { class: 'grade-5', text: '5', numeric: 5 }
    if (grade === 'ECTS-B') return { class: 'grade-4', text: '4', numeric: 4 }
    if (grade === 'ECTS-C') return { class: 'grade-4', text: '4', numeric: 4 }
    if (grade === 'ECTS-D') return { class: 'grade-3', text: '3', numeric: 3 }
    if (grade === 'ECTS-E') return { class: 'grade-3', text: '3', numeric: 3 }
    if (grade === 'ECTS-F') return { class: 'grade-2', text: '2', numeric: 2 }
    
    // Pass/Fail
    if (grade === 'ЗАЧЁТ' || grade === 'PASS') return { class: 'grade-pass', text: 'Зачёт', numeric: null }
    if (grade === 'НЕЗАЧЁТ' || grade === 'FAIL') return { class: 'grade-fail', text: 'Незачёт', numeric: null }
    
    return { class: 'grade-undefined', text: '—', numeric: null }
}

function getGradeDescription(mark) {
    if (!mark) return 'Не определено'
    const grade = mark.toUpperCase()
    const map = {
        '5': 'Отлично',
        '4': 'Хорошо',
        '3': 'Удовлетворительно',
        '2': 'Неудовлетворительно',
        'ECTS-A': 'Отлично',
        'ECTS-B': 'Хорошо',
        'ECTS-C': 'Хорошо',
        'ECTS-D': 'Удовлетворительно',
        'ECTS-E': 'Удовлетворительно',
        'ECTS-F': 'Неудовлетворительно',
        'ЗАЧЁТ': 'Зачёт',
        'НЕЗАЧЁТ': 'Незачёт',
        'PASS': 'Зачёт',
        'FAIL': 'Незачёт',
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

// Mobile modal functions
function openMobileModal(disciplineId) {
    const discipline = state.disciplines.find(d => String(d.ID) === String(disciplineId))
    if (discipline) {
        els.modalTitle.textContent = discipline.SubjectName || 'Дисциплина'
    }
    els.mobileModal.classList.add('active')
    document.body.style.overflow = 'hidden'
}

function closeMobileModal() {
    els.mobileModal.classList.remove('active')
    document.body.style.overflow = ''
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
    
    clearPanels()
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
    clearPanels()
}

async function loadDisciplineDetails(disciplineId) {
    try {
        showLoading()
        
        const { json } = await apiGet(
            `/api/student/discipline/journal?token=${encodeURIComponent(state.token)}&id=${encodeURIComponent(disciplineId)}`
        )
        
        const data = json?.response || {}
        
        // Render both desktop and mobile
        renderDetailPanel(data, els.gradeContent, els.journalContent, els.teachersContent)
        renderDetailPanel(data, els.modalGradeContent, els.modalJournalContent, els.modalTeachersContent)
        
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
        const gradeInfo = getGradeInfo(mark)
        const rate = d.Rate ?? '-'
        const maxRate = d.MaxCurrentRate ?? '-'
        const isActive = state.selectedDiscipline === id
        
        return `
            <div class="disc-item ${isActive ? 'active' : ''}" data-id="${id}" style="animation: fadeIn 0.3s ease ${index * 0.05}s both">
                <div class="disc-header">
                    <div class="disc-name">${escapeHtml(d.SubjectName || 'Без названия')}</div>
                    ${mark ? `<span class="disc-grade ${gradeInfo.class}">${gradeInfo.text}</span>` : ''}
                </div>
                <div class="disc-meta">
                    <span class="disc-type">${translateType(d.Type)}</span>
                    <span class="disc-points">${rate}${maxRate !== '-' ? '/' + maxRate : ''} балл.</span>
                </div>
            </div>
        `
    }).join('')
    
    els.discList.querySelectorAll('.disc-item').forEach(item => {
        item.addEventListener('click', () => selectDiscipline(item.dataset.id))
    })
}

function selectDiscipline(id) {
    state.selectedDiscipline = id
    
    els.discList.querySelectorAll('.disc-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === id)
    })
    
    // On mobile, open modal
    if (state.isMobile) {
        openMobileModal(id)
    }
    
    loadDisciplineDetails(id)
}

function renderDetailPanel(data, gradeEl, journalEl, teachersEl) {
    const discipline = data.Discipline || {}
    const mark = state.marks[state.selectedDiscipline] || state.marks[String(state.selectedDiscipline)] || ''
    
    renderGradeTab(data, mark, gradeEl)
    renderJournalTab(data, journalEl)
    renderTeachersTab(data, teachersEl)
}

function renderGradeTab(data, mark, container) {
    const discipline = data.Discipline || {}
    const gradeInfo = getGradeInfo(mark)
    const rate = discipline.Rate ?? '-'
    const maxRate = discipline.MaxCurrentRate ?? '-'
    
    container.innerHTML = `
        <div class="grade-display">
            <div class="grade-big ${gradeInfo.class}">${gradeInfo.text}</div>
            <div class="grade-label">${getGradeDescription(mark)}</div>
            
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
                    <span class="info-label">Баллы</span>
                    <span class="info-value">${rate}${maxRate !== '-' ? ' / ' + maxRate : ''}</span>
                </div>
            </div>
        </div>
    `
}

function renderJournalTab(data, container) {
    const journal = Array.isArray(data.Journal) ? data.Journal : []
    
    if (!journal.length) {
        container.innerHTML = `
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
                <p>Информация о занятиях недоступна</p>
            </div>
        `
        return
    }
    
    // Mobile-friendly card list instead of table
    if (state.isMobile) {
        container.innerHTML = `
            <div class="journal-list">
                ${journal.map(j => `
                    <div class="journal-item">
                        <div class="journal-header">
                            <span class="journal-date">${formatDate(j.LessonDate)}</span>
                            <span class="journal-type">${escapeHtml(j.LessonType || '—')}</span>
                        </div>
                        ${j.Topic ? `<div class="journal-topic">${escapeHtml(j.Topic)}</div>` : ''}
                        <div class="journal-footer">
                            <span class="journal-mark">${j.Mark !== null && j.Mark !== undefined ? j.Mark : '—'} балл.</span>
                            <span class="journal-status ${j.Attended ? 'attended' : 'missed'}">
                                ${j.Attended ? '✓ Присутствовал' : '✗ Отсутствовал'}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `
    } else {
        // Desktop table
        container.innerHTML = `
            <table class="journal-table">
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Тип</th>
                        <th>Тема</th>
                        <th>Баллы</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
                    ${journal.map(j => `
                        <tr>
                            <td>${formatDate(j.LessonDate)}</td>
                            <td>${escapeHtml(j.LessonType || '—')}</td>
                            <td>${escapeHtml(j.Topic || '—')}</td>
                            <td>${j.Mark !== null && j.Mark !== undefined ? j.Mark : '—'}</td>
                            <td class="${j.Attended ? 'attended' : 'missed'}">
                                ${j.Attended ? '✓' : '✗'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `
    }
}

function renderTeachersTab(data, container) {
    const teachers = Array.isArray(data.Teachers) ? data.Teachers : []
    
    if (!teachers.length) {
        container.innerHTML = `
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
    
    container.innerHTML = `
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

function clearPanels() {
    const emptyStateHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h3>Выберите дисциплину</h3>
            <p>Нажмите на дисциплину, чтобы увидеть подробности</p>
        </div>
    `
    
    els.gradeContent.innerHTML = emptyStateHTML
    els.journalContent.innerHTML = emptyStateHTML
    els.teachersContent.innerHTML = emptyStateHTML
    
    if (els.modalGradeContent) {
        els.modalGradeContent.innerHTML = emptyStateHTML
        els.modalJournalContent.innerHTML = emptyStateHTML
        els.modalTeachersContent.innerHTML = emptyStateHTML
    }
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

// Tab switching
function setupTabs(container) {
    const tabs = container.querySelectorAll('.tab')
    const contents = container.querySelectorAll('.tab-content')
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab
            
            tabs.forEach(t => t.classList.remove('active'))
            contents.forEach(c => c.classList.remove('active'))
            
            tab.classList.add('active')
            container.querySelector(`#${container.id ? container.id + '-' : ''}tab-${tabName}`)?.classList.add('active')
            
            // Also update mobile tabs if needed
            if (!container.closest('.mobile-modal')) {
                const mobileTab = document.querySelector(`.mobile-modal .tab[data-tab="${tabName}"]`)
                if (mobileTab) {
                    mobileTab.click()
                }
            }
        })
    })
}

// Initialize
async function init() {
    // Check for saved token
    const saved = storageGet()
    if (saved.token && saved.remember) {
        els.tokenInput.value = saved.token
        els.rememberCheck.checked = true
    }
    
    // Check mobile on resize
    window.addEventListener('resize', () => {
        state.isMobile = window.innerWidth <= 640
    })
    
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
    
    // Mobile modal
    els.btnCloseModal.addEventListener('click', closeMobileModal)
    els.mobileModal.addEventListener('click', (e) => {
        if (e.target === els.mobileModal) closeMobileModal()
    })
    
    // Setup tabs
    setupTabs(document.querySelector('.detail-panel'))
    setupTabs(document.querySelector('.mobile-modal .card'))
    
    // Close modal on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && els.mobileModal.classList.contains('active')) {
            closeMobileModal()
        }
    })
}

// Initialize app
init()
