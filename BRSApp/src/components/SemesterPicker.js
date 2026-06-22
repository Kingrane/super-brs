import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../theme'
import { formatSemesterLabel } from '../utils/helpers'

export default function SemesterPicker({
  semesters,
  currentID,
  onSelect,
}) {
  const options = semesters.map(s => ({
    value: String(s.ID),
    label: formatSemesterLabel(s),
  }))

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Семестр</Text>
      <View style={styles.list}>
        {options.map(opt => {
          const active = String(opt.value) === String(currentID)
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(opt.value)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  list: {
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
})
