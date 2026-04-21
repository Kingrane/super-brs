import { proxyStudentEndpoint, validateToken } from "../_studentApi.js"
import { passThroughJson, requireMethod, sendError } from "../_http.js"

export default async function handler(req, res) {
    if (!requireMethod(req, res, "GET")) {
        return
    }

    const token = req.query.token
    const semesterID = req.query.SemesterID

    const tokenValidationError = validateToken(token)
    if (tokenValidationError) {
        return sendError(res, 400, tokenValidationError)
    }

    try {
        const { res: upstreamResponse, text } = await proxyStudentEndpoint("/student", {
            token,
            SemesterID: semesterID
        })
        return passThroughJson(res, upstreamResponse, text)
    } catch (e) {
        return sendError(res, 502, "Upstream request failed", e.message)
    }
}
