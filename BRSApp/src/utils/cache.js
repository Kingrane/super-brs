import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_PREFIX = '@grade_dashboard_cache:'
const DETAIL_CACHE_PREFIX = '@grade_detail_cache:'

function makeCacheKey(token, scope, prefix = CACHE_PREFIX) {
  let hash = 2166136261
  for (const char of `${token}:${scope}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `${prefix}${(hash >>> 0).toString(16)}`
}

export async function getDashboardCache(token, semesterID) {
  try {
    const raw = await AsyncStorage.getItem(makeCacheKey(token, semesterID))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function setDashboardCache(token, semesterID, data) {
  try {
    await AsyncStorage.setItem(makeCacheKey(token, semesterID), JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      semesterID: String(semesterID),
      ...data,
    }))
  } catch {
    // A full or unavailable local store should not break online use.
  }
}


export async function getDetailCache(token, semesterID, disciplineID) {
  try {
    const raw = await AsyncStorage.getItem(makeCacheKey(token, `${semesterID}:${disciplineID}`, DETAIL_CACHE_PREFIX))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function setDetailCache(token, semesterID, disciplineID, data) {
  try {
    await AsyncStorage.setItem(makeCacheKey(token, `${semesterID}:${disciplineID}`, DETAIL_CACHE_PREFIX), JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      semesterID: String(semesterID),
      disciplineID: String(disciplineID),
      ...data,
    }))
  } catch {
    // A full or unavailable local store should not break online use.
  }
}
