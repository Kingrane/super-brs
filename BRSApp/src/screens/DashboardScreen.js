import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { colors, fonts } from '../theme'
import { fetchSemesters, fetchIndex } from '../api/client'
import { formatSemesterLabel } from '../utils/helpers'
import DisciplineCard from '../components/DisciplineCard'
import StateLoading from '../components/StateLoading'
import StateError from '../components/StateError'

export default function DashboardScreen({ route, navigation }) {
  const { token } = route.params
  const [semesters, setSemesters] = useState([])
  const [currentSemesterID, setCurrentSemesterID] = useState(route.params?.semesterID || '')
  const [disciplines, setDisciplines] = useState([])
  const [marks, setMarks] = useState({})
  const [teachersMap, setTeachersMap] = useState({})
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
      setDisciplines(Array.isArray(idxResponse.Disciplines) ? idxResponse.Disciplines : [])
      setMarks(idxResponse.Marks || {})
      setTeachersMap(idxResponse.Teachers || {})
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

  const handleLogout = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
  }

  const renderHeader = () => (
    <View>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.kicker}>БРС ЮФУ</Text>
          <Text style={styles.topTitle}>Мои дисциплины</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.btn} onPress={handleRefresh}>
            <Text style={styles.btnText}>Обновить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleLogout}>
            <Text style={[styles.btnText, { color: colors.accent }]}>Выйти</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.semesterBar}>
        <Text style={styles.semesterLabel}>Семестр</Text>
        <View style={styles.semesterChips}>
          {semesters.map((s) => {
            const active = String(s.ID) === String(currentSemesterID)
            return (
              <TouchableOpacity
                key={String(s.ID)}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleSemesterPress(String(s.ID))}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {formatSemesterLabel(s)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Список дисциплин</Text>
        <Text style={styles.listCount}>{String(disciplines.length)}</Text>
      </View>
    </View>
  )

  if (loading && disciplines.length === 0) {
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
      <FlatList
        data={disciplines}
        keyExtractor={(item) => String(item.ID)}
        ListHeaderComponent={renderHeader}
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
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: 12,
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
    fontSize: 28,
    fontFamily: fonts.display,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 30,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    borderWidth: 1,
    borderColor: colors.rule2,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.ink,
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
