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

export function parseSimpleXml(xml) {
  try {
    const obj = {}
    const rootMatch = xml.match(/<(\w+)[^>]*>[\s\S]*<\/\1>/)
    if (!rootMatch) return null
    const rootTag = rootMatch[1]
    const inner = xml.replace(/<\?xml[^>]+\?>/, '').trim()
    const itemRegex = /<(\w+)>([\s\S]*?)<\/\1>/g
    let m
    while ((m = itemRegex.exec(inner)) !== null) {
      const tag = m[1]
      let val = m[2].trim()
      const childMatch = val.match(/^<(\w+)>/)
      if (childMatch) {
        const children = []
        const childRegex = /<(\w+)>([\s\S]*?)<\/\1>/g
        let cm
        while ((cm = childRegex.exec(val)) !== null) {
          children.push({ [cm[1]]: cm[2].trim() })
        }
        if (children.length) {
          if (!obj[tag]) obj[tag] = []
          obj[tag].push(Object.assign({}, ...children))
          continue
        }
      }
      if (tag === rootTag && !/^<(\w+)>/.test(val)) continue
      if (!obj[tag]) obj[tag] = []
      obj[tag].push(val)
    }
    return obj
  } catch {
    return null
  }
}

export function getIndexTeachersForDiscipline(teachersMap, disciplineID) {
  const value =
    teachersMap[String(disciplineID)] || teachersMap[disciplineID]
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') return Object.values(value)
  return []
}

export function parseEventsData(xmlOrObj) {
  if (!xmlOrObj) return []
  let items = []

  if (typeof xmlOrObj === 'string') {
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    let match
    while ((match = itemRegex.exec(xmlOrObj)) !== null) {
      const content = match[1]
      const getTag = tag => {
        const m = content.match(
          new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
        )
        return m ? m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : ''
      }

      const title = getTag('title') || 'выставлены баллы'
      const pubDate = getTag('pubDate') || getTag('date') || '-'
      const author = getTag('author') || getTag('teacher') || '-'
      const category =
        getTag('category') ||
        getTag('discipline') ||
        getTag('subject') ||
        '-'
      const desc = getTag('description') || ''

      let dateFormatted = pubDate
      if (pubDate !== '-') {
        const parsed = new Date(pubDate)
        if (!isNaN(parsed.getTime())) {
          dateFormatted =
            parsed.toLocaleDateString('ru-RU') +
            ' ' +
            parsed.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })
        }
      }

      let section = '-'
      let subsection = '-'
      let value = '-'

      if (desc) {
        const secM = desc.match(/Раздел:\s*([^;]+)/i)
        if (secM) section = secM[1].trim()

        const subM = desc.match(/Подраздел:\s*([^;]+)/i)
        if (subM) subsection = subM[1].trim()

        const valM = desc.match(/(?:Значение|Балл|Оценка):\s*([^;]+)/i)
        if (valM) value = valM[1].trim()
      }

      items.push({
        id: `${items.length}-${dateFormatted}`,
        date: dateFormatted,
        event: title,
        teacher: author,
        discipline: category,
        value,
        section,
        subsection,
      })
    }
  }

  return items
}
