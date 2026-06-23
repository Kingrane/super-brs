import { XMLParser } from 'fast-xml-parser'
import { sendError, requireMethod, passThroughJson } from '../../_http.js'
import { validateToken, validateId } from '../../_studentApi.js'
import { GRADE_ORIGIN } from '../../_gradeFetch.js'

const TIMEOUT = 12_000

async function upstreamFetch(path, queryEntries) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(queryEntries)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value))
    }
  }
  const url = `${GRADE_ORIGIN}${path}?${qs.toString()}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'grade-student-web/0.1' },
    })
    const text = await res.text()
    return { res, text }
  } finally {
    clearTimeout(t)
  }
}

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return

  const token = req.headers['x-auth-token'] || req.query.token
  const tokenErr = validateToken(token)
  if (tokenErr) return sendError(res, 400, tokenErr)

  const id = req.query.id
  const idErr = validateId(id)
  if (idErr) return sendError(res, 400, idErr)

  const recordbookID = req.query.recordbookID
  const semesterID = req.query.semesterID

  const queryEntries = { token, recordbookID, semesterID }
  const { res: upstream, text } = await upstreamFetch('/api/v0/events', queryEntries)

  if (!upstream.ok) {
    return sendError(res, upstream.status, 'Upstream returned an error', `HTTP ${upstream.status}: ${text.slice(0, 200)}`)
  }

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => name === 'event' || name === 'Event',
    })
    const json = parser.parse(text)
    return res.status(200).json(json)
  } catch (parseErr) {
    return passThroughJson(res, upstream, text)
  }
}
