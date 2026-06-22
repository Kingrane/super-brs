import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, fonts } from '../theme'
import GradeBadge from './GradeBadge'
import {
  formatDisciplineType,
  formatTeacherShortName,
  getGradePresentation,
  getIndexTeachersForDiscipline,
} from '../utils/helpers'

export default function DisciplineCard({
  discipline,
  mark,
  teachersMap,
  index,
  active,
  onPress,
}) {
  const grade = getGradePresentation(mark, discipline)
  const teachers = getIndexTeachersForDiscipline(teachersMap, discipline.ID)
  const teachersPreview = teachers
    .slice(0, 2)
    .map(t => formatTeacherShortName(t))
    .join(' · ')
  const teachersOverflow =
    teachers.length > 2 ? ` +${teachers.length - 2}` : ''
  const points = discipline.MaxCurrentRate
    ? `${discipline.Rate || 0} / ${discipline.MaxCurrentRate}`
    : `${discipline.Rate || 0}`

  return (
    <TouchableOpacity
      style={[styles.card, active && styles.active]}
      onPress={() => onPress(String(discipline.ID))}
      activeOpacity={0.7}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={2}>
          {discipline.SubjectName || 'Без названия'}
        </Text>
        <GradeBadge text={grade.text} tone={grade.tone} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {formatDisciplineType(discipline.Type)}
        </Text>
        <Text style={styles.metaPoints}>{points} б.</Text>
      </View>
      <Text style={styles.teachers} numberOfLines={1}>
        {teachersPreview || 'Преподаватели не указаны'}
        {teachersOverflow}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleSoft,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  active: {
    backgroundColor: colors.paperWarm,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.display,
    fontWeight: '500',
    color: colors.ink,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  metaPoints: {
    fontSize: 11,
    color: colors.inkMute,
    fontFamily: fonts.mono,
  },
  teachers: {
    fontSize: 12,
    color: colors.inkSoft,
    fontFamily: fonts.display,
    fontStyle: 'italic',
  },
})
