import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  markPhaseStart,
  markPhaseEnd,
  deletePhase,
} from '../store/slices/phaseSlice';

interface PhaseMarkerControlsProps {
  onEditPhase?: (phaseIndex: number, startFrame: number, endFrame: number) => void;
}

const PHASE_NAMES = [
  'Setup Carve',
  'Wind Up',
  'Snap',
  'Takeoff',
  'Air',
  'Landing',
];

const PHASE_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
];

export const PhaseMarkerControls: React.FC<PhaseMarkerControlsProps> = ({
  onEditPhase,
}) => {
  const dispatch = useAppDispatch();
  const currentFrame = useAppSelector((state) => state.video.currentFrame);
  const currentTimestamp = useAppSelector((state) => state.video.currentTimestamp);
  const currentPhaseIndex = useAppSelector((state) => state.phase.currentPhaseIndex);
  const tempStartFrame = useAppSelector((state) => state.phase.tempStartFrame);
  const tempStartTimestamp = useAppSelector((state) => state.phase.tempStartTimestamp);
  const markedPhases = useAppSelector((state) => state.phase.markedPhases);
  const currentPhaseName = PHASE_NAMES[currentPhaseIndex];
  const currentPhaseColor = PHASE_COLORS[currentPhaseIndex];

  return (
    <View style={styles.container}>
      <View style={styles.currentPhaseSection}>
        <View
          style={[
            styles.phaseIndicator,
            { backgroundColor: currentPhaseColor },
          ]}
        >
          <Text style={styles.phaseIndicatorText}>{currentPhaseName}</Text>
        </View>

        <View style={styles.frameInfo}>
          <Text style={styles.frameLabel}>Current Frame</Text>
          <Text style={styles.frameValue}>{currentFrame}</Text>
        </View>

        <View style={styles.timeInfo}>
          <Text style={styles.timeLabel}>Time</Text>
          <Text style={styles.timeValue}>
            {(currentTimestamp / 1000).toFixed(2)}s
          </Text>
        </View>
      </View>

      <View style={styles.controlsSection}>
        {tempStartFrame === null ? (
          <TouchableOpacity
            style={styles.markButton}
            onPress={() => dispatch(markPhaseStart({ frameNumber: currentFrame, timestamp: currentTimestamp }))}
          >
            <Text style={styles.markButtonText}>Mark Start</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.startMarkedInfo}>
              <Text style={styles.startMarkedLabel}>Start Marked</Text>
              <Text style={styles.startMarkedValue}>
                Frame {tempStartFrame}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.markEndButton}
              onPress={() => dispatch(markPhaseEnd({ frameNumber: currentFrame, timestamp: currentTimestamp }))}
            >
              <Text style={styles.markButtonText}>Mark End</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView style={styles.phasesListSection}>
        <Text style={styles.phasesListTitle}>Marked Phases</Text>

        {markedPhases.length === 0 ? (
          <Text style={styles.emptyText}>No phases marked yet</Text>
        ) : (
          markedPhases.map((phase, index) => (
            <View
              key={phase.phaseIndex}
              style={[
                styles.phaseItem,
                {
                  borderLeftColor: PHASE_COLORS[phase.phaseIndex],
                },
              ]}
            >
              <View style={styles.phaseItemContent}>
                <Text style={styles.phaseItemName}>
                  {PHASE_NAMES[phase.phaseIndex]}
                </Text>
                <Text style={styles.phaseItemRange}>
                  Frames {phase.startFrame} - {phase.endFrame}
                </Text>
                <Text style={styles.phaseItemDuration}>
                  Duration: {phase.duration.toFixed(2)}s
                </Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => dispatch(deletePhase(phase.phaseIndex))}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          Progress: {markedPhases.length} / 6 phases
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(markedPhases.length / 6) * 100}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
  },
  currentPhaseSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  phaseIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  phaseIndicatorText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  frameInfo: {
    flex: 1,
  },
  frameLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  frameValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  controlsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  markButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  markEndButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  markButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  startMarkedInfo: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  startMarkedLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  startMarkedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  phasesListSection: {
    maxHeight: 200,
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  phasesListTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  phaseItemContent: {
    flex: 1,
  },
  phaseItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  phaseItemRange: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  phaseItemDuration: {
    fontSize: 10,
    color: '#999',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 16,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
});
