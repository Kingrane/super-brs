import { parseSimpleXml } from '../utils/helpers'

const API_V1 = 'https://grade.sfedu.ru/api/v1/student'
const API_V0 = 'https://grade.sfedu.ru/api/v0'
const TIMEOUT = 15000

const ENDPOINTS = {
  semesters: `${API_V1}/semester_list`,
  index: `${API_V1}`,
  journal: `${API_V1}/discipline/journal`,
  subject: `${API_V1}/discipline/subject`,
  events: `${API_V0}/events`,
}

function buildQuery(params) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value))
    }
  }
  return qs.toString()
}

async function apiGet(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'grade-student-mobile/1.0',
      },
    })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch { json = null }
    return { res, text, json }
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchJson(endpoint, params = {}) {
  const query = buildQuery(params)
  const url = query ? `${endpoint}?${query}` : endpoint
  const { res, json } = await apiGet(url)

  if (!res.ok) {
    const errMessage = json?.error || json?.message || `HTTP ${res.status}`
    const details = json?.details ? ` (${json.details})` : ''
    throw new Error(errMessage + details)
  }

  return json
}

export async function fetchSemesters(token) {
  return fetchJson(ENDPOINTS.semesters, { token })
}

export async function fetchIndex(token, semesterID) {
  return fetchJson(ENDPOINTS.index, { token, SemesterID: semesterID })
}

export async function fetchJournal(token, id) {
  return fetchJson(ENDPOINTS.journal, { token, id })
}

export async function fetchSubject(token, id) {
  return fetchJson(ENDPOINTS.subject, { token, id })
}

async function apiGetText(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'grade-student-mobile/1.0' },
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return text
  } finally {
    clearTimeout(timer)
  }
}

import { parseEventsData } from '../utils/helpers'

export async function fetchEvents(token, recordbookID, semesterID) {
  const query = buildQuery({ token, recordbookID, semesterID })
  const xml = await apiGetText(`${ENDPOINTS.events}?${query}`)
  return parseEventsData(xml)
}
