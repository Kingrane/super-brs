export function sendError(res, status, error, details) {
    const payload = { error }
    if (details) {
        payload.details = details
    }
    return res.status(status).json(payload)
}

export function requireMethod(req, res, method) {
    if (req.method !== method) {
        sendError(res, 405, "Method Not Allowed")
        return false
    }
    return true
}

export function passThroughJson(res, upstreamResponse, text) {
    const contentType = upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8"
    res.setHeader("Content-Type", contentType)
    return res.status(upstreamResponse.status).send(text)
}
