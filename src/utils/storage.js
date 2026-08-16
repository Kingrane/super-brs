export function getStoredAuth() {
    return {
        token: localStorage.getItem("grade_token") || "",
        remember: localStorage.getItem("grade_remember") === "1"
    }
}

export function setStoredAuth(token, remember) {
    localStorage.setItem("grade_remember", remember ? "1" : "0")
    if (remember) {
        localStorage.setItem("grade_token", token)
    } else {
        localStorage.removeItem("grade_token")
    }
}

export function clearStoredAuth() {
    localStorage.removeItem("grade_token")
    localStorage.removeItem("grade_remember")
}

export function isLikelyToken(token) {
    return /^[0-9a-z-]{16,80}$/i.test((token || "").trim())
}
