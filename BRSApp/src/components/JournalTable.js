import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { colors, fonts } from '../theme'
import StateEmpty from './StateEmpty'

export default function JournalTable({ journal }) {
  if (!journal || journal.length === 0) {
    return (
      <StateEmpty
        title="Журнал пуст"
        description="Для этой дисциплины журнал не вернул записей."
      />
    )
  }

  return (
    <ScrollView horizontal>
      <View style={styles.table}>
        <View style={styles.header}>
          <Text style={[styles.cell, styles.headerCell, { width: 100 }]}>Дата</Text>
          <Text style={[styles.cell, styles.headerCell, { width: 100 }]}>Тип</Text>
          <Text style={[styles.cell, styles.headerCell, { width: 160 }]}>Тема</Text>
          <Text style={[styles.cell, styles.headerCell, { width: 60 }]}>Баллы</Text>
          <Text style={[styles.cell, styles.headerCell, { width: 80 }]}>Посещение</Text>
        </View>
        {journal.map((entry, idx) => {
          const date = entry.LessonDate
            ? new Date(entry.LessonDate).toLocaleDateString('ru-RU')
            : '-'
          const mark = entry.Mark ?? '-'
          const attendedText = entry.Attended ? 'Да' : 'Нет'
          return (
            <View key={`${idx}-${entry.ID || date}`} style={styles.row}>
              <Text style={[styles.cell, { width: 100 }]}>{date}</Text>
              <Text style={[styles.cell, { width: 100 }]}>
                {entry.LessonType || '-'}
              </Text>
              <Text style={[styles.cell, { width: 160 }]} numberOfLines={1}>
                {entry.Topic || '-'}
              </Text>
              <Text style={[styles.cell, styles.mono, { width: 60 }]}>
                {mark}
              </Text>
              <Text
                style={[
                  styles.cell,
                  { width: 80 },
                  entry.Attended ? styles.attended : styles.missed,
                ]}>
                {attendedText}
              </Text>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  table: {
    minWidth: 500,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.paper2,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleSoft,
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: colors.ink,
  },
  headerCell: {
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.inkSoft,
  },
  mono: {
    fontFamily: fonts.mono,
  },
  attended: {
    color: colors.gExcellent,
    fontWeight: '600',
  },
  missed: {
    color: colors.accent,
    fontWeight: '600',
  },
})
