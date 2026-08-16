import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts } from '../theme'
import { fetchSemesters, fetchIndex, fetchEvents } from '../api/client'
import { clearStoredAuth } from '../utils/storage'
import { formatSemesterLabel } from '../utils/helpers'
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
      setSemesters(list)

      const idxResponse = idxJson?.response || {}
      const nextDisciplines = Array.isArray(idxResponse.Disciplines) ? idxResponse.Disciplines : []
      const rId = idxResponse.RecordbookID || idxResponse.RecordBook || idxResponse.Student?.RecordbookID || idxResponse.Student?.RecordBook || idxResponse.Student?.ID || ''
      
      setDisciplines(nextDisciplines)
      setMarks(idxResponse.Marks || {})
      setTeachersMap(idxResponse.Teachers || {})
      setRecordbookID(String(rId))

      // Load global events for the semester
      try {
        const eventsList = await fetchEvents(token, String(rId), semesterID)
        setGlobalEvents(Array.isArray(eventsList) ? eventsList : [])
      } catch {
        setGlobalEvents([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadAll(currentSemesterID)
  }, [currentSemesterID, loadAll])

  const handleSemesterPress = (id) => {
    setCurrentSemesterID(id)
  }

  const handleDisciplinePress = (id) => {
    navigation.navigate('Detail', { token, disciplineID: id, semesterID: currentSemesterID })
  }

  const handleRefresh = () => {
    loadAll(currentSemesterID)
  }

  const handleLogout = async () => {
    await clearStoredAuth()
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
  }

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
        <StateLoading />
      </View>
    )
  }

  if (error && disciplines.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        {renderHeader()}
        <StateError
          title="Ошибка загрузки"
          details={error}
          onRetry={handleRefresh}
        />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
      {mainNav === 'disciplines' ? (
        <FlatList
          data={disciplines}
          keyExtractor={(item) => String(item.ID)}
          ListHeaderComponent={renderHeader}
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
  listContent: {
    paddingBottom: 32,
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
