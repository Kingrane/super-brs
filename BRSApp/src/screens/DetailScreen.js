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
import { fetchJournal, fetchSubject, fetchIndex } from '../api/client'
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

const TABS = [
  { key: 'grade', label: 'Оценка' },
  { key: 'journal', label: 'Журнал' },
  { key: 'map', label: 'Модули' },
  { key: 'teachers', label: 'Преподаватели' },
]

export default function DetailScreen({ route, navigation }) {
  const { token, disciplineID, semesterID } = route.params

  const [discipline, setDiscipline] = useState(null)
  const [marks, setMarks] = useState({})
  const [teachersMap, setTeachersMap] = useState({})
  const [journal, setJournal] = useState(null)
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('grade')

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
    } catch (err) {
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
              <ModuleCard key={idx} module={mod} submodules={submodules} />
            ))}
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

      default:
        return null
    }
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <StateLoading />
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
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
      <ScrollView contentContainerStyle={styles.scroll}>
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
})
