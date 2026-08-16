import { XMLParser } from 'fast-xml-parser'
import { gradeFetch } from '../../_gradeFetch.js'
import { sendError, requireMethod, passThroughJson } from '../../_http.js'
import { validateToken, validateId } from '../../_studentApi.js'

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return

  const token = req.headers['x-auth-token'] || req.query.token
  const tokenErr = validateToken(token)
  if (tokenErr) return sendError(res, 400, tokenErr)

  const id = req.query.id
  if (id) {
    const idErr = validateId(id)
    if (idErr) return sendError(res, 400, idErr)
  }

  const recordbookID = req.query.recordbookID
  const semesterID = req.query.semesterID || req.query.SemesterID

  const queryEntries = { token }
  if (id) queryEntries.id = id
  if (recordbookID) queryEntries.recordbookID = recordbookID
  if (semesterID) queryEntries.semesterID = semesterID

  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(queryEntries)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value))
    }
  }

  try {
    // Try gradeFetch with /api/v0/events
    let { res: upstream, text } = await gradeFetch(`/../v0/events?${qs.toString()}`, { method: 'GET' })

    if (!upstream.ok) {
      // Fallback to /student/events
      const retry = await gradeFetch(`/student/events?${qs.toString()}`, { method: 'GET' })
      if (retry.res.ok) {
        upstream = retry.res
        text = retry.text
      }
    }

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
  } catch (err) {
    return sendError(res, 502, 'Upstream request failed', err.message)
  }
}
