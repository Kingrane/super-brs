import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native'
import { colors, fonts } from '../theme'
import { formatSemesterLabel } from '../utils/helpers'

export default function SemesterPicker({
  semesters,
  currentID,
  onSelect,
}) {
  const [modalVisible, setModalVisible] = useState(false)

  const selectedSem = semesters.find((s) => String(s.ID) === String(currentID))
  const selectedLabel = selectedSem ? formatSemesterLabel(selectedSem) : 'Выберите семестр'

  const handlePick = (id) => {
    onSelect(id)
    setModalVisible(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Семестр</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}>
        <Text style={styles.triggerText}>{selectedLabel}</Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Выбор семестра</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} padding={4}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={semesters}
                  keyExtractor={(item) => String(item.ID)}
                  renderItem={({ item }) => {
                    const active = String(item.ID) === String(currentID)
                    return (
                      <TouchableOpacity
                        style={[styles.itemRow, active && styles.itemRowActive]}
                        onPress={() => handlePick(String(item.ID))}>
                        <Text style={[styles.itemText, active && styles.itemTextActive]}>
                          {formatSemesterLabel(item)}
                        </Text>
                        {active && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.rule2,
    backgroundColor: colors.paper,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  triggerText: {
    fontSize: 14,
    fontFamily: fonts.body,
    fontWeight: '500',
    color: colors.ink,
  },
  arrow: {
    fontSize: 10,
    color: colors.accent,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 20, 28, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.rule2,
    maxHeight: 380,
    paddingVertical: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.ink,
  },
  closeBtn: {
    fontSize: 16,
    color: colors.inkMute,
    paddingHorizontal: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleSoft,
  },
  itemRowActive: {
    backgroundColor: colors.accentSoft,
  },
  itemText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  itemTextActive: {
    fontWeight: '600',
    color: colors.accent,
  },
  checkMark: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: 'bold',
  },
})
