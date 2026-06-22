import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts } from '../theme'

export default function TeacherRow({ teacher, index }) {
  const fullName =
    teacher.Name ||
    `${teacher.LastName || ''} ${teacher.FirstName || ''} ${teacher.SecondName || ''}`.trim() ||
    'Без имени'
  const role = teacher.JobPositionName || 'Преподаватель'
  const initials = (
    (teacher.LastName || '').slice(0, 1) +
    (teacher.FirstName || '').slice(0, 1)
  ).toUpperCase() || 'PR'

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.role}>{role}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleSoft,
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.rule2,
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    color: colors.ink,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontFamily: fonts.display,
    fontWeight: '500',
    color: colors.ink,
  },
  role: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
})
