const SCHEDULE_BASE = "https://schedule.sfedu.ru/APIv1"

const cached = new Map()

async function cachedJson(url, { force = false } = {}) {
    if (!force && cached.has(url)) return cached.get(url)

    if (cached.has(url)) cached.delete(url)

    const promise = fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
        })
        .catch((err) => {
            cached.delete(url)
            throw err
        })

    cached.set(url, promise)
    return promise
}

export function fetchScheduleGrades({ force = false } = {}) {
    return cachedJson(`${SCHEDULE_BASE}/grade/list`, { force })
}

export function fetchGroupsForGrade(gradeId, { force = false } = {}) {
    return cachedJson(`${SCHEDULE_BASE}/group/forGrade/${gradeId}`, { force })
}

export function fetchScheduleForGroup(groupId, { force = false } = {}) {
    return cachedJson(`${SCHEDULE_BASE}/schedule/group/${groupId}`, { force })
}

export function fetchScheduleTimeList({ force = false } = {}) {
    return cachedJson(`${SCHEDULE_BASE}/time/list`, { force })
}