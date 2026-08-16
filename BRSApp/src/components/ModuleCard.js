import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts } from '../theme'

export default function ModuleCard({ module, submodules, examSubIds = new Set() }) {
  const filteredSubIds = (module.Submodules || []).filter(id => !examSubIds.has(id))
  const subs = filteredSubIds.map((id) => submodules[id]).filter(Boolean)

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{module.Title || 'Модуль'}</Text>
      {subs.length === 0 && (
        <View style={styles.row}>
          <Text style={styles.subName}>Нет подмодулей</Text>
          <Text style={styles.subPoints}>-</Text>
        </View>
      )}
      {subs.map((sub, idx) => (
        <View key={String(idx)} style={styles.row}>
          <Text style={styles.subName}>{sub.Title || 'Подмодуль'}</Text>
          <Text style={styles.subPoints}>
            {sub.Rate ?? '-'} / {sub.MaxRate ?? '-'}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ruleLight,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: colors.ruleLight,
    marginTop: 4,
    paddingTop: 6,
  },
  subName: {
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  subPoints: {
    fontSize: 11,
    color: colors.inkMute,
    fontFamily: fonts.mono,
    marginLeft: 12,
  },
})
