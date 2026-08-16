import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts } from '../theme'

export default function EventCard({ event }) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.date}>{event.date}</Text>
        {event.value !== '-' && (
          <View style={styles.valueBadge}>
            <Text style={styles.valueText}>+{event.value}</Text>
          </View>
        )}
      </View>

      <Text style={styles.eventTitle}>{event.event}</Text>

      {event.discipline !== '-' && (
        <Text style={styles.discipline} numberOfLines={2}>
          {event.discipline}
        </Text>
      )}

      {event.teacher !== '-' && (
        <Text style={styles.teacher} numberOfLines={1}>
          {event.teacher}
        </Text>
      )}

      {(event.section !== '-' || event.subsection !== '-') && (
        <View style={styles.detailsRow}>
          {event.section !== '-' && (
            <Text style={styles.detailText}>Раздел: {event.section}</Text>
          )}
          {event.subsection !== '-' && (
            <Text style={styles.detailText}>Подраздел: {event.subsection}</Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleSoft,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.paper,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    fontFamily: fonts.mono,
    color: colors.inkMute,
  },
  valueBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  valueText: {
    color: colors.paper,
    fontSize: 12,
    fontFamily: fonts.mono,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: fonts.body,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 2,
  },
  discipline: {
    fontSize: 14,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 2,
  },
  teacher: {
    fontSize: 13,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    color: colors.inkSoft,
    marginBottom: 4,
  },
  detailsRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.ruleLight,
    gap: 2,
  },
  detailText: {
    fontSize: 12,
    color: colors.inkMute,
  },
})
