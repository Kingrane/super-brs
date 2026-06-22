import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts } from '../theme'

const toneColors = {
  excellent: { fg: colors.gExcellent, bg: colors.gExcellentBg },
  good: { fg: colors.gGood, bg: colors.gGoodBg },
  mid: { fg: colors.gMid, bg: colors.gMidBg },
  bad: { fg: colors.gBad, bg: colors.gBadBg },
  muted: { fg: colors.gMute, bg: colors.gMuteBg },
}

export default function GradeBadge({ text, tone = 'muted', large }) {
  const t = toneColors[tone] || toneColors.muted
  return (
    <View
      style={[
        styles.badge,
        { borderColor: t.fg, backgroundColor: t.bg },
        large && styles.large,
      ]}>
      <Text style={[styles.text, { color: t.fg }, large && styles.largeText]}>
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 36,
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontWeight: '500',
    fontSize: 14,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  largeText: {
    fontSize: 22,
  },
})
