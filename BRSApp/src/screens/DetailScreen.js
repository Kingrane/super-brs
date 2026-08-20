import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { colors, fonts } from '../theme'
import { getDetailCache, setDetailCache } from '../utils/cache'
import { fetchJournal, fetchSubject, fetchIndex, fetchEvents } from '../api/client'
import {
  formatDisciplineType,
  formatTeacherShortName,
  getGradePresentation,
  getIndexTeachersForDiscipline,
} from '../utils/helpers'
import StateLoading from '../components/StateLoading'
import StateEmpty from '../components/StateEmpty'
import StateError from '../components/StateError'
import GradeBadge from '../components/GradeBadge'
import JournalTable from '../components/JournalTable'
import ModuleCard from '../components/ModuleCard'
import TeacherRow from '../components/TeacherRow'
import EventCard from '../components/EventCard'

const TABS = [
  { key: 'grade', label: 'Оценка' },
  { key: 'journal', label: 'Журнал' },
  { key: 'map', label: 'Модули' },
  { key: 'teachers', label: 'Преподаватели' },
  { key: 'events', label: 'История' },
]

export default function DetailScreen({ route, navigation }) {
  const { token, disciplineID, semesterID } = route.params

  const [discipline, setDiscipline] = useState(null)
  const [marks, setMarks] = useState({})
  const [teachersMap, setTeachersMap] = useState({})
  const [journal, setJournal] = useState(null)
  const [subject, setSubject] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [activeTab, setActiveTab] = useState('grade')

  const applyCache = (cached) => {
    setDiscipline(cached.discipline || null)
    setMarks(cached.marks || {})
    setTeachersMap(cached.teachersMap || {})
    setJournal(cached.journal || null)
    setSubject(cached.subject || null)
    setEvents(Array.isArray(cached.events) ? cached.events : [])
    setLastUpdated(cached.savedAt || '')
  }

  const isNetworkError = (err) => !/^HTTP \d{3}/i.test(String(err?.message || ''))

  const formatCacheDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [idxJson, journalJson, subjectJson] = await Promise.all([
        fetchIndex(token, semesterID),
        fetchJournal(token, disciplineID),
        fetchSubject(token, disciplineID).catch(() => null),
      ])

      const idxResponse = idxJson?.response || {}
      const nextDisciplines = Array.isArray(idxResponse.Disciplines)
        ? idxResponse.Disciplines
        : []
      const found = nextDisciplines.find(
        (d) => String(d.ID) === String(disciplineID),
      )
      if (found) setDiscipline(found)
      setMarks(idxResponse.Marks || {})
      setTeachersMap(idxResponse.Teachers || {})
      setJournal(journalJson)
      setSubject(subjectJson)

      const rId = idxResponse.RecordbookID || idxResponse.RecordBook || idxResponse.Student?.RecordbookID || idxResponse.Student?.RecordBook || idxResponse.Student?.ID || ''
      let nextEvents = []
      try {
        const eventsList = await fetchEvents(token, String(rId), semesterID)
        nextEvents = Array.isArray(eventsList) ? eventsList : []
        setEvents(nextEvents)
      } catch {
        const cached = await getDetailCache(token, semesterID, disciplineID)
        nextEvents = Array.isArray(cached?.events) ? cached.events : []
        setEvents(nextEvents)
      }

      const savedAt = new Date().toISOString()
      setOffline(false)
      setLastUpdated(savedAt)
      await setDetailCache(token, semesterID, disciplineID, {
        discipline: found || null,
        marks: idxResponse.Marks || {},
        teachersMap: idxResponse.Teachers || {},
        journal: journalJson,
        subject: subjectJson,
        events: nextEvents,
        savedAt,
      })
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await getDetailCache(token, semesterID, disciplineID)
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
  }, [token, semesterID, disciplineID])

  useEffect(() => {
    loadData()
  }, [loadData])

  const currentDiscipline = discipline

  const markRaw =
    marks[String(disciplineID)] || marks[disciplineID] || ''
  const grade = getGradePresentation(markRaw, currentDiscipline)

  const journalData = Array.isArray(journal?.response?.Journal)
    ? journal.response.Journal
    : []

  const disciplineMap = subject?.response?.DisciplineMap
  const submodules = subject?.response?.Submodules || {}
  const modules = disciplineMap?.Modules
    ? Object.values(disciplineMap.Modules)
    : []

  const fromJournalTeachers = Array.isArray(journal?.response?.Teachers)
    ? journal.response.Teachers
    : []
  const fromSubjectTeachers = Array.isArray(subject?.response?.Teachers)
    ? subject.response.Teachers
    : []
  const fromIndexTeachers = currentDiscipline
    ? getIndexTeachersForDiscipline(teachersMap, currentDiscipline.ID)
    : []
  const mergedTeachers = useMemo(() => {
    const all = [
      ...fromJournalTeachers,
      ...fromSubjectTeachers,
      ...fromIndexTeachers,
    ]
    const uniq = []
    const seen = new Set()
    for (const t of all) {
      const key = String(
        t.ID || t.TeacherID || t.Name || `${t.LastName}-${t.FirstName}`,
      )
      if (!seen.has(key)) {
        seen.add(key)
        uniq.push(t)
      }
    }
    return uniq
  }, [fromJournalTeachers, fromSubjectTeachers, fromIndexTeachers])

  const subjectInfo =
    subject?.response?.Discipline ||
    journal?.response?.Discipline ||
    currentDiscipline ||
    {}

  const isExamType = /exam|difftest|coursework/i.test(String(subjectInfo?.Type || ''))

  // Module Calculations (matching web App)
  const allSubmodules = Object.values(submodules || {})
  const submoduleIds = Object.keys(submodules || {})

  const bonusSubIds = new Set()
  const bonusRefs = Array.isArray(disciplineMap?.Bonus)
    ? disciplineMap.Bonus
    : [disciplineMap?.Bonus]
  for (const ref of bonusRefs) {
    const id = ref && typeof ref === 'object' ? (ref.ID ?? ref.id ?? ref.SubmoduleID) : ref
    if (id !== undefined && id !== null) bonusSubIds.add(String(id))
  }

  const examSubIds = new Set()
  for (const [id, sm] of Object.entries(submodules || {})) {
    if (bonusSubIds.has(String(id))) continue
    const t = (sm?.Title || '').trim()
    if (t === '' && isExamType) examSubIds.add(String(id))
    else if (/экзамен|exam|зачёт|аттестац|итогов/i.test(t)) examSubIds.add(String(id))
  }
  for (const mod of modules) {
    if (/экзамен|exam|зачёт|аттестац|итогов/i.test(mod.Title || '')) {
      ;(mod.Submodules || []).forEach(id => {
        if (!bonusSubIds.has(String(id))) examSubIds.add(String(id))
      })
    }
  }

  const examId = [...examSubIds][0] || null
  const examSm = examId ? submodules[examId] : null
  const calcExamRate = subjectInfo?.ExamRate ?? subjectInfo?.Exam?.Rate ?? disciplineMap?.Exam?.Rate ?? disciplineMap?.Final?.Rate ?? examSm?.Rate ?? null
  const examMax = 40

  const regSubs = allSubmodules.filter((sm, i) => !examSubIds.has(submoduleIds[i]) && !bonusSubIds.has(submoduleIds[i]))
  const examSubs = allSubmodules.filter((sm, i) => examSubIds.has(submoduleIds[i]))
  const bonusSubs = allSubmodules.filter((sm, i) => bonusSubIds.has(submoduleIds[i]))
  const regRate = regSubs.reduce((s, sm) => s + (Number(sm.Rate) || 0), 0)
  const regMax = regSubs.reduce((s, sm) => s + (Number(sm.MaxRate) || 0), 0)
  const exRate = examSubs.reduce((s, sm) => s + (Number(sm.Rate) || 0), 0)
  const exMax = 40
  const bonusRate = bonusSubs.reduce((s, sm) => s + (Number(sm.Rate) || 0), 0)
  const bonusMax = bonusSubs.reduce((s, sm) => s + (Number(sm.MaxRate) || 0), 0)

  const examFoundInSubs = examSubIds.size > 0
  const addExRate = (examFoundInSubs || !isExamType) ? 0 : (Number(calcExamRate) || 0)
  const showExamRate = examFoundInSubs ? exRate : calcExamRate
  const showExamMax = examFoundInSubs ? exMax : examMax
  const hasExamData = isExamType && (examFoundInSubs || (calcExamRate != null && examMax != null))
  const hasBonusData = bonusSubs.length > 0

  const totalRate = regRate + bonusRate + exRate + addExRate
  const totalMax = 100

  const renderTab = (key) => {
    switch (key) {
      case 'grade':
        return (
          <View style={styles.gradePanel}>
            <GradeBadge text={grade.text} tone={grade.tone} large />
            <Text style={styles.gradeDesc}>{grade.description}</Text>
            <View style={styles.kvGrid}>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Тип</Text>
                <Text style={styles.kvVal}>
                  {formatDisciplineType(subjectInfo?.Type)}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Семестр</Text>
                <Text style={styles.kvVal}>{semesterID || '-'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Баллы</Text>
                <Text style={[styles.kvVal, styles.mono]}>
                  {subjectInfo?.Rate ?? currentDiscipline?.Rate ?? '-'} /{' '}
                  {subjectInfo?.MaxCurrentRate ??
                    currentDiscipline?.MaxCurrentRate ??
                    '-'}
                </Text>
              </View>
              {isExamType && (
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>Баллы за экзамен</Text>
                  <Text style={[styles.kvVal, styles.mono]}>
                    {showExamRate ?? '-'} / {showExamMax ?? '-'}
                  </Text>
                </View>
              )}
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>ID</Text>
                <Text style={[styles.kvVal, styles.mono]}>
                  {subjectInfo?.ID || currentDiscipline?.ID || '-'}
                </Text>
              </View>
            </View>
          </View>
        )

      case 'journal':
        return <JournalTable journal={journalData} />

      case 'map':
        if (modules.length === 0) {
          return (
            <StateEmpty
              title="Модули недоступны"
              description="API не вернул структуру модулей для этой дисциплины."
            />
          )
        }
        return (
          <View style={styles.moduleList}>
            {modules.map((mod, idx) => (
              <ModuleCard key={idx} module={mod} submodules={submodules} examSubIds={examSubIds} bonusSubIds={bonusSubIds} />
            ))}
            <View style={styles.moduleTotalRow}>
              <Text style={styles.moduleTotalLabel}>Итого по модулям</Text>
              <Text style={styles.moduleTotalValue}>
                {regRate} / {isExamType ? regMax : totalMax}
              </Text>
            </View>
            {hasBonusData && (
              <View style={styles.moduleBonusRow}>
                <Text style={styles.moduleBonusLabel}>Бонусные баллы</Text>
                <Text style={styles.moduleBonusValue}>
                  {bonusRate} / {bonusMax}
                </Text>
              </View>
            )}
            {hasExamData && (
              <View style={styles.moduleExamRow}>
                <Text style={styles.moduleExamLabel}>Экзамен</Text>
                <Text style={styles.moduleExamValue}>
                  {showExamRate ?? '-'} / {showExamMax ?? '-'}
                </Text>
              </View>
            )}
            <View style={[styles.moduleTotalRow, styles.moduleGrandTotalRow]}>
              <Text style={styles.moduleGrandTotalLabel}>Итого</Text>
              <Text style={styles.moduleGrandTotalValue}>
                {totalRate} / {totalMax}
              </Text>
            </View>
          </View>
        )

      case 'teachers':
        if (mergedTeachers.length === 0) {
          return (
            <StateEmpty
              title="Список пуст"
              description="Преподаватели для выбранной дисциплины не найдены."
            />
          )
        }
        return (
          <View>
            {mergedTeachers.map((t, idx) => (
              <TeacherRow key={String(t.ID || t.TeacherID || idx)} teacher={t} />
            ))}
          </View>
        )

      case 'events': {
        if (!events || events.length === 0) {
          return (
            <StateEmpty
              title="История пуста"
              description="Записей в истории событий не найдено."
            />
          )
        }
        return (
          <View style={styles.eventList}>
            {events.map((ev, idx) => (
              <EventCard key={ev.id || String(idx)} event={ev} />
            ))}
          </View>
        )
      }

      default:
        return null
    }
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <StateLoading />
        <Text style={styles.footer}>romka навайбкодил</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <StateError
          title="Ошибка загрузки"
          details={error}
          onRetry={loadData}
        />
        <Text style={styles.footer}>romka навайбкодил</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {offline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineTitle}>Нет соединения</Text>
            <Text style={styles.offlineText}>Показаны последние сохранённые данные{lastUpdated ? ` · ${formatCacheDate(lastUpdated)}` : ''}</Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {currentDiscipline?.SubjectName || subjectInfo?.SubjectName || 'Детали дисциплины'}
          </Text>
          <GradeBadge text={grade.text} tone={grade.tone} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}>
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.tabContent}>{renderTab(activeTab)}</View>
        <Text style={styles.footer}>romka навайбкодил</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  footer: {
    marginTop: 28,
    fontSize: 10,
    color: colors.inkFaint,
    textAlign: 'center',
    fontFamily: fonts.mono,
    letterSpacing: 1.5,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: fonts.display,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 24,
  },
  tabsScroll: {
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  tabTextActive: {
    color: colors.ink,
  },
  tabContent: {
    paddingTop: 12,
  },
  gradePanel: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  gradeDesc: {
    fontSize: 14,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    color: colors.inkSoft,
    marginTop: 8,
    marginBottom: 16,
  },
  kvGrid: {
    width: '100%',
    gap: 0,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleSoft,
  },
  kvKey: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  kvVal: {
    fontSize: 14,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    color: colors.ink,
  },
  mono: {
    fontFamily: fonts.mono,
    fontStyle: 'normal',
  },
  moduleList: {
    gap: 0,
  },
  moduleTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  moduleTotalLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    fontWeight: '600',
    color: colors.ink,
  },
  moduleTotalValue: {
    fontSize: 13,
    fontFamily: fonts.mono,
    color: colors.inkSoft,
  },
  moduleBonusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.rule2,
  },
  moduleBonusLabel: {
    fontSize: 14,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  moduleBonusValue: {
    fontSize: 13,
    fontFamily: fonts.mono,
    color: colors.gExcellent,
  },
  moduleExamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  moduleExamLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    fontWeight: '600',
    color: colors.accent,
  },
  moduleExamValue: {
    fontSize: 13,
    fontFamily: fonts.mono,
    color: colors.accent,
  },
  moduleGrandTotalRow: {
    paddingVertical: 14,
    marginTop: 4,
  },
  moduleGrandTotalLabel: {
    fontSize: 15,
    fontFamily: fonts.body,
    fontWeight: '700',
    color: colors.ink,
  },
  moduleGrandTotalValue: {
    fontSize: 14,
    fontFamily: fonts.mono,
    fontWeight: '700',
    color: colors.ink,
  },
  eventList: {
    gap: 0,
  },
})
