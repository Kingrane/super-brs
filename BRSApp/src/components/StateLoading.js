import React from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { colors } from '../theme'

export default function StateLoading() {
  const shimmer = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [shimmer])

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  })

  const Skeleton = ({ style }) => (
    <View style={[styles.skeleton, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  )

  return (
    <View style={styles.container}>
      <Skeleton style={styles.lg} />
      <Skeleton />
      <Skeleton style={{ width: '60%' }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    gap: 10,
  },
  skeleton: {
    height: 12,
    backgroundColor: colors.paper2,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  shimmer: {
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  lg: {
    height: 24,
  },
})
