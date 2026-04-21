import { passThroughJson, requireMethod, sendError } from "../../_http.js"
import { proxyStudentEndpoint, validateId, validateToken } from "../../_studentApi.js"

export default async function handler(req, res) {
    if (!requireMethod(req, res, "GET")) {
        return
    }

    const token = req.query.token
    const id = req.query.id

    const tokenValidationError = validateToken(token)
    if (tokenValidationError) {
        return sendError(res, 400, tokenValidationError)
    }

    const idValidationError = validateId(id)
    if (idValidationError) {
        return sendError(res, 400, idValidationError)
    }

    try {
        const { res: upstreamResponse, text } = await proxyStudentEndpoint("/student/discipline/subject", { token, id })
        return passThroughJson(res, upstreamResponse, text)
    } catch (e) {
        return sendError(res, 502, "Upstream request failed", e.message)
    }
}
