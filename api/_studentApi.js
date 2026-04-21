import { gradeFetch } from "./_gradeFetch.js"

export function buildQuery(queryEntries) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(queryEntries)) {
        if (value !== undefined && value !== null && value !== "") {
            qs.set(key, String(value))
        }
    }
    return qs.toString()
}

export function validateToken(token) {
    if (!token) {
        return "token is required"
    }
    if (String(token).trim().length < 16) {
        return "token is too short"
    }
    return null
}

export function validateId(id, name = "id") {
    if (!id) {
        return `${name} is required`
    }
    return null
}

export async function proxyStudentEndpoint(path, queryEntries) {
    const qs = buildQuery(queryEntries)
    const fullPath = qs ? `${path}?${qs}` : path
    return gradeFetch(fullPath, { method: "GET" })
}
