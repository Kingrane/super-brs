import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts } from '../theme'
import { fetchSemesters, fetchIndex, fetchEvents } from '../api/client'
import { formatSemesterLabel } from '../utils/helpers'
import { getDashboardCache, setDashboardCache } from '../utils/cache'
import DisciplineCard from '../components/DisciplineCard'
import EventCard from '../components/EventCard'
import SemesterPicker from '../components/SemesterPicker'
import StateLoading from '../components/StateLoading'
import StateError from '../components/StateError'
import StateEmpty from '../components/StateEmpty'

export default function DashboardScreen({ route, navigation }) {
  const insets = useSafeAreaInsets()
  const { token } = route.params
  const [mainNav, setMainNav] = useState('disciplines') // 'disciplines' | 'events'
  const [semesters, setSemesters] = useState([])
  const [currentSemesterID, setCurrentSemesterID] = useState(route.params?.semesterID || '')
  const [recordbookID, setRecordbookID] = useState('')
  const [disciplines, setDisciplines] = useState([])
  const [marks, setMarks] = useState({})
  const [teachersMap, setTeachersMap] = useState({})
  const [globalEvents, setGlobalEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)

  const applyCache = (cached) => {
    setSemesters(Array.isArray(cached.semesters) ? cached.semesters : [])
    setDisciplines(Array.isArray(cached.disciplines) ? cached.disciplines : [])
    setMarks(cached.marks || {})
    setTeachersMap(cached.teachersMap || {})
    setRecordbookID(cached.recordbookID || '')
    setGlobalEvents(Array.isArray(cached.globalEvents) ? cached.globalEvents : [])
    setLastUpdated(cached.savedAt || '')
  }

  const isNetworkError = (err) => !/^HTTP \d{3}/i.test(String(err?.message || ''))

  const loadAll = useCallback(async (semesterID) => {
    if (!semesterID) return
    setLoading(true)
    setError('')
    try {
      const [semJson, idxJson] = await Promise.all([
        fetchSemesters(token),
        fetchIndex(token, semesterID),
      ])

      const semResponse = semJson?.response || {}
      const list = Array.isArray(semResponse) ? semResponse : Object.values(semResponse)
      list.sort((a, b) => Number(b.ID || 0) - Number(a.ID || 0))

      const idxResponse = idxJson?.response || {}
      const nextDisciplines = Array.isArray(idxResponse.Disciplines) ? idxResponse.Disciplines : []
      const rId = idxResponse.RecordbookID || idxResponse.RecordBook || idxResponse.Student?.RecordbookID || idxResponse.Student?.RecordBook || idxResponse.Student?.ID || ''

      setSemesters(list)
      setDisciplines(nextDisciplines)
      setMarks(idxResponse.Marks || {})
      setTeachersMap(idxResponse.Teachers || {})
      setRecordbookID(String(rId))
      setOffline(false)

      let nextEvents = []
      try {
        const eventsList = await fetchEvents(token, String(rId), semesterID)
        nextEvents = Array.isArray(eventsList) ? eventsList : []
        setGlobalEvents(nextEvents)
      } catch {
        const cached = await getDashboardCache(token, semesterID)
        nextEvents = Array.isArray(cached?.globalEvents) ? cached.globalEvents : []
        setGlobalEvents(nextEvents)
      }

      const savedAt = new Date().toISOString()
      setLastUpdated(savedAt)
      await setDashboardCache(token, semesterID, {
        semesters: list,
        disciplines: nextDisciplines,
        marks: idxResponse.Marks || {},
        teachersMap: idxResponse.Teachers || {},
        recordbookID: String(rId),
        globalEvents: nextEvents,
        savedAt,
      })
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await getDashboardCache(token, semesterID)
        if (cached) {
          applyCache(cached)
          setOffline(true)
          setError('')
          return
        }
      }
      setOffline(false)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadAll(currentSemesterID)
  }, [currentSemesterID, loadAll])

  const formatCacheDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const handleSemesterPress = (id) => {
    setCurrentSemesterID(id)
  }

  const handleDisciplinePress = (id) => {
    navigation.navigate('Detail', { token, disciplineID: id, semesterID: currentSemesterID })
  }

  const handleRefresh = () => {
    loadAll(currentSemesterID)
  }

  const handleLogout = () => {
    setConfirmLogoutOpen(true)
  }

  const confirmLogout = () => {
    setConfirmLogoutOpen(false)
    navigation.reset({ index: 0, routes: [{ name: 'Login', params: { skipAutoLogin: true } }] })
  }

  const renderFooter = () => (
    <Text style={styles.footer}>romka навайбкодил</Text>
  )

  const renderLogoutModal = () => (
    <Modal
      visible={confirmLogoutOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setConfirmLogoutOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalKicker}>ПОДТВЕРЖДЕНИЕ</Text>
          <Text style={styles.modalTitle}>Выйти из аккаунта?</Text>
          <Text style={styles.modalDescription}>
            Вы вернётесь на экран входа. Сохранённый токен останется в поле ввода.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmLogoutOpen(false)}>
              <Text style={styles.modalCancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} onPress={confirmLogout}>
              <Text style={styles.modalConfirmText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={[styles.topbar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topbarLeft}>
          <Text style={styles.kicker}>БРС ЮФУ</Text>
          <Text style={styles.topTitle}>Сервис БРС</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.btn} onPress={handleRefresh}>
            <Text style={styles.btnText}>Обновить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnLogout]} onPress={handleLogout}>
            <Text style={styles.btnTextLogout}>Выйти</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.navToggleRow}>
        <TouchableOpacity
          style={[styles.navBtn, mainNav === 'disciplines' && styles.navBtnActive]}
          onPress={() => setMainNav('disciplines')}>
          <Text style={[styles.navBtnText, mainNav === 'disciplines' && styles.navBtnTextActive]}>
            Дисциплины
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, mainNav === 'events' && styles.navBtnActive]}
          onPress={() => setMainNav('events')}>
          <Text style={[styles.navBtnText, mainNav === 'events' && styles.navBtnTextActive]}>
            История событий
          </Text>
        </TouchableOpacity>
      </View>

      <SemesterPicker
        semesters={semesters}
        currentID={currentSemesterID}
        onSelect={handleSemesterPress}
      />

      {offline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineTitle}>Нет соединения</Text>
          <Text style={styles.offlineText}>Показаны последние сохранённые данные{lastUpdated ? ` · ${formatCacheDate(lastUpdated)}` : ''}</Text>
        </View>
      ) : null}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {mainNav === 'disciplines' ? 'Список дисциплин' : 'История событий'}
        </Text>
        <Text style={styles.listCount}>
          {mainNav === 'disciplines' ? String(disciplines.length) : String(globalEvents.length)}
        </Text>
      </View>
    </View>
  )

  if (loading && disciplines.length === 0 && globalEvents.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        {renderHeader()}
        {renderLogoutModal()}
        <StateLoading />
        {renderFooter()}
      </View>
    )
  }

  if (error && disciplines.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        {renderHeader()}
        {renderLogoutModal()}
        <StateError
          title="Ошибка загрузки"
          details={error}
          onRetry={handleRefresh}
        />
        {renderFooter()}
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
      {renderLogoutModal()}
      {mainNav === 'disciplines' ? (
        <FlatList
          data={disciplines}
          keyExtractor={(item) => String(item.ID)}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <StateEmpty title="Нет дисциплин" description="В выбранном семестре не найдено дисциплин." />
          }
          renderItem={({ item }) => (
            <DisciplineCard
              discipline={item}
              mark={marks[String(item.ID)] || marks[item.ID] || ''}
              teachersMap={teachersMap}
              onPress={handleDisciplinePress}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={globalEvents}
          keyExtractor={(item, index) => item.id || String(index)}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <StateEmpty title="История пуста" description="Записей в истории событий не найдено." />
          }
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  headerContainer: {
    paddingHorizontal: 16,
  },
  offlineBanner: {
    marginBottom: 14,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  offlineText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
  },
  listContent: {
    paddingBottom: 32,
  },
  footer: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 10,
    color: colors.inkFaint,
    textAlign: 'center',
    fontFamily: fonts.mono,
    letterSpacing: 1.5,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: 12,
  },
  topbarLeft: {
    flexShrink: 1,
    marginRight: 12,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  topTitle: {
    fontSize: 26,
    fontFamily: fonts.display,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 28,
  },
  topActions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  btn: {
    borderWidth: 1,
    borderColor: colors.rule2,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnLogout: {
    borderColor: colors.accentLine,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.ink,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(14,20,28,0.42)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule2,
  },
  modalKicker: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: colors.inkSoft,
  },
  modalTitle: {
    marginTop: 8,
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  modalDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 22,
  },
  modalCancel: {
    borderWidth: 1,
    borderColor: colors.rule2,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  modalConfirm: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalConfirmText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.paper,
  },
  btnTextLogout: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.accent,
  },
  navToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.rule2,
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  navBtnActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.ink,
  },
  navBtnTextActive: {
    color: colors.paper,
  },
  semesterBar: {
    marginBottom: 16,
  },
  semesterLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  semesterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.rule2,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  chipTextActive: {
    color: colors.accent,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.ink,
  },
  listCount: {
    fontSize: 11,
    fontFamily: fonts.mono,
    color: colors.inkMute,
    borderWidth: 1,
    borderColor: colors.rule2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
})
