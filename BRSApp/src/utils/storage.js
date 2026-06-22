import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  token: '@grade_token',
  remember: '@grade_remember',
}

export async function getStoredAuth() {
  try {
    const token = (await AsyncStorage.getItem(KEYS.token)) || ''
    const remember = (await AsyncStorage.getItem(KEYS.remember)) === '1'
    return { token, remember }
  } catch {
    return { token: '', remember: false }
  }
}

export async function setStoredAuth(token, remember) {
  try {
    await AsyncStorage.setItem(KEYS.remember, remember ? '1' : '0')
    if (remember) {
      await AsyncStorage.setItem(KEYS.token, token)
    } else {
      await AsyncStorage.removeItem(KEYS.token)
    }
  } catch {}
}

export async function clearStoredAuth() {
  try {
    await AsyncStorage.removeItem(KEYS.token)
    await AsyncStorage.removeItem(KEYS.remember)
  } catch {}
}
