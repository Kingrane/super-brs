import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  StatusBar,
} from 'react-native'
import { colors, fonts } from '../theme'
import { isLikelyToken } from '../utils/helpers'
import { getStoredAuth, setStoredAuth } from '../utils/storage'
import { fetchSemesters, fetchIndex } from '../api/client'

export default function LoginScreen({ navigation }) {
  const [tokenInput, setTokenInput] = useState('')
  const [remember, setRemember] = useState(false)
  const [status, setStatus] = useState({ message: '', type: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const stored = await getStoredAuth()
      if (stored.remember && stored.token) {
        setTokenInput(stored.token)
        setRemember(true)
        setLoading(true)
        try {
          const json = await fetchSemesters(stored.token)
          const response = json?.response || {}
          const list = Array.isArray(response) ? response : Object.values(response)
          list.sort((a, b) => Number(b.ID || 0) - Number(a.ID || 0))
          const semesterID = list[0] ? String(list[0].ID) : ''
          await fetchIndex(stored.token, semesterID)
          navigation.replace('Main', { token: stored.token, semesterID })
        } catch {
          setStatus({ message: 'Не удалось автоматически войти. Проверьте токен.', type: 'error' })
        } finally {
          setLoading(false)
        }
      }
    })()
  }, [])

  const handleLogin = async () => {
    const authToken = tokenInput.trim()
    if (!isLikelyToken(authToken)) {
      setStatus({
        message: 'Введите валидный токен (обычно 36-40 символов).',
        type: 'error',
      })
      return
    }

    setLoading(true)
    setStatus({ message: 'Проверка токена...', type: '' })

    try {
      const json = await fetchSemesters(authToken)
      const response = json?.response || {}
      const list = Array.isArray(response) ? response : Object.values(response)
      if (list.length === 0) {
        setStatus({ message: 'Сервер не вернул семестры. Возможно, токен недействителен.', type: 'error' })
        setLoading(false)
        return
      }
      list.sort((a, b) => Number(b.ID || 0) - Number(a.ID || 0))
      const semesterID = String(list[0].ID)
      await fetchIndex(authToken, semesterID)

      await setStoredAuth(authToken, remember)

      navigation.replace('Main', { token: authToken, semesterID })
    } catch (err) {
      setStatus({ message: `Ошибка входа: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.kicker}>БРС ЮФУ</Text>
          <Text style={styles.title}>Сервис БРС ЮФУ</Text>
          <Text style={styles.lead}>
            Сильный человек это не тот кто поднимает тяжести или управляет
            компанией, а тот кто получил 60 баллов по непре
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>ТОКЕН</Text>
            <TextInput
              style={styles.input}
              placeholder="40 символов hex"
              placeholderTextColor={colors.inkFaint}
              maxLength={40}
              autoCapitalize="none"
              autoCorrect={false}
              value={tokenInput}
              onChangeText={setTokenInput}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            <View style={styles.rememberRow}>
              <View style={styles.switchRow}>
                <Switch
                  value={remember}
                  onValueChange={setRemember}
                  trackColor={{ false: colors.rule2, true: colors.accentLine }}
                  thumbColor={remember ? colors.accent : colors.inkFaint}
                />
                <Text style={styles.rememberText}>Запомнить на этом устройстве</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.paper} size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Войти</Text>
              )}
            </TouchableOpacity>

            {status.message ? (
              <Text
                style={[
                  styles.status,
                  status.type === 'error' && styles.statusError,
                ]}>
                {status.message}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: 28,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: fonts.display,
    fontWeight: '400',
    color: colors.ink,
    marginBottom: 12,
    lineHeight: 34,
  },
  lead: {
    fontSize: 14,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    color: colors.ink2,
    lineHeight: 22,
    marginBottom: 28,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.inkSoft,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule2,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    fontFamily: fonts.mono,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  loginBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ink,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: colors.paper,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 14,
  },
  status: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.inkSoft,
    textAlign: 'center',
    minHeight: 20,
  },
  statusError: {
    color: colors.accent,
  },
})
