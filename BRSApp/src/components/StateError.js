import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, fonts } from '../theme'

export default function StateError({ title, details, onRetry }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {details && <Text style={styles.desc}>{details}</Text>}
      {onRetry && (
        <TouchableOpacity style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>Повторить</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: colors.surface2,
    padding: 16,
    margin: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    color: colors.accent,
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  retry: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.rule2,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.ink,
  },
})
