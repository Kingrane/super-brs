export function isLikelyToken(token) {
  return /^[0-9a-z-]{16,80}$/i.test(token.trim())
}

export function normalizeNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function formatDisciplineType(type) {
  const key = String(type || '').toLowerCase()
  const map = {
    exam: 'Экзамен',
    credit: 'Зачет',
    test: 'Тест',
    difftest: 'Дифференцированный зачет',
    coursework: 'Курсовая работа',
    practice: 'Практика',
    lecture: 'Лекция',
    seminar: 'Семинар',
    laboratory: 'Лабораторная',
    lab: 'Лабораторная',
  }
  return map[key] || type || '-'
}

export function formatTeacherShortName(teacher) {
  const lastName = teacher.LastName || ''
  const firstInitial = (teacher.FirstName || '').slice(0, 1)
  const secondInitial = (teacher.SecondName || '').slice(0, 1)
  const compactInitials = [firstInitial, secondInitial]
    .filter(Boolean)
    .map(v => `${v}.`)
    .join('')
  const fallback = teacher.Name || ''
  if (lastName) return `${lastName} ${compactInitials}`.trim()
  return fallback || 'Преподаватель'
}

export function formatSemesterLabel(semester) {
  const season =
    semester.Season === 'spring'
      ? 'Весна'
      : semester.Season === 'autumn'
        ? 'Осень'
        : 'Семестр'
  const year = semester.CalendarYear || semester.Year || '-'
  return `${season} ${year}`
}

function getGradeToneByPercent(percent) {
  if (percent === null) return 'muted'
  if (percent >= 85) return 'excellent'
  if (percent >= 70) return 'good'
  if (percent >= 50) return 'mid'
  return 'bad'
}

export function getGradePresentation(mark, discipline) {
  const rate = normalizeNumber(discipline?.Rate)
  const maxRate = normalizeNumber(discipline?.MaxCurrentRate)
  const percent =
    rate !== null && maxRate !== null && maxRate > 0
      ? Math.round((rate / maxRate) * 100)
      : null

  if (percent !== null) {
    return {
      text: `${percent}%`,
      tone: getGradeToneByPercent(percent),
      description: 'Процент освоения дисциплины',
    }
  }

  const value = String(mark || '').toUpperCase()
  const map = {
    '5': { text: '100%', tone: 'excellent', description: 'Оценка 5' },
    '4': { text: '80%', tone: 'good', description: 'Оценка 4' },
    '3': { text: '60%', tone: 'mid', description: 'Оценка 3' },
    '2': { text: '40%', tone: 'bad', description: 'Оценка 2' },
    'ECTS-A': { text: '95%', tone: 'excellent', description: 'ECTS-A' },
    'ECTS-B': { text: '85%', tone: 'good', description: 'ECTS-B' },
    'ECTS-C': { text: '75%', tone: 'good', description: 'ECTS-C' },
    'ECTS-D': { text: '65%', tone: 'mid', description: 'ECTS-D' },
    'ECTS-E': { text: '55%', tone: 'mid', description: 'ECTS-E' },
    'ECTS-F': { text: '35%', tone: 'bad', description: 'ECTS-F' },
    PASS: { text: '100%', tone: 'excellent', description: 'Зачет' },
    FAIL: { text: '40%', tone: 'bad', description: 'Незачет' },
    'ЗАЧЁТ': { text: '100%', tone: 'excellent', description: 'Зачет' },
    'НЕЗАЧЁТ': { text: '40%', tone: 'bad', description: 'Незачет' },
  }
  return (
    map[value] || { text: '-', tone: 'muted', description: 'Не определено' }
  )
}

export function getIndexTeachersForDiscipline(teachersMap, disciplineID) {
  const value =
    teachersMap[String(disciplineID)] || teachersMap[disciplineID]
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') return Object.values(value)
  return []
}
