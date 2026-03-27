export const GRADE_ORIGIN = "https://grade.sfedu.ru";
export const API_BASE = "/api/v1";

export async function gradeFetch(path, init = {}) {
    const url = GRADE_ORIGIN + API_BASE + path;

    const controller = new AbortController();
    const timeoutMs = 12_000;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            redirect: "follow",
            ...init,
            signal: controller.signal,
            headers: {
                "user-agent": "grade-student-web/0.1",
                ...(init.headers || {})
            }
        });

        const text = await res.text();
        return { res, text };
    } finally {
        clearTimeout(t);
    }
}