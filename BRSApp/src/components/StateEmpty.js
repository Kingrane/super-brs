import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts } from '../theme'

export default function StateEmpty({ title, description }) {
  return (
    <View style={styles.container}>
      <Text style={styles.dash}>—</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.desc}>{description}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  dash: {
    fontSize: 22,
    color: colors.inkFaint,
    fontFamily: fonts.display,
    letterSpacing: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    color: colors.ink,
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
  },
})
