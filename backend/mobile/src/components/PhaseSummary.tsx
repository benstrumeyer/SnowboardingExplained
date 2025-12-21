import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MarkedPhase } from '../hooks/usePhaseMarking';

interface PhaseSummaryProps {
  markedPhases: MarkedPhase[];
  onSelectPhase: (phase: MarkedPhase) => void;
  selectedPhaseIndex?: number;
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

export const PhaseSummary: React.FC<PhaseSummaryProps> = ({
  markedPhases,
  onSelectPhase,
  selectedPhaseIndex,
}) => {
  if (markedPhases.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No phases marked yet</Text>
        <Text style={styles.emptySubtext}>
          Mark phases to see summary here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Phase Summary</Text>

      {markedPhases.map((phase) => (
        <TouchableOpacity
          key={phase.phaseIndex}
          style={[
            styles.phaseCard,
            selectedPhaseIndex === phase.phaseIndex && styles.phaseCardSelected,
          ]}
          onPress={() => onSelectPhase(phase)}
        >
          <View
            style={[
              styles.phaseColorBar,
              { backgroundColor: PHASE_COLORS[phase.phaseIndex] },
            ]}
          />

          <View style={styles.phaseCardContent}>
            <View style={styles.phaseHeader}>
              <Text style={styles.phaseName}>
                {PHASE_NAMES[phase.phaseIndex]}
              </Text>
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>
                  {phase.endFrame - phase.startFrame} frames
                </Text>
              </View>
            </View>

            <View style={styles.phaseDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Start Frame:</Text>
                <Text style={styles.detailValue}>{phase.startFrame}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>End Frame:</Text>
                <Text style={styles.detailValue}>{phase.endFrame}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>
                  {phase.duration.toFixed(2)}s
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time Range:</Text>
                <Text style={styles.detailValue}>
                  {(phase.startTimestamp / 1000).toFixed(2)}s -{' '}
                  {(phase.endTimestamp / 1000).toFixed(2)}s
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.selectIndicator}>
            {selectedPhaseIndex === phase.phaseIndex && (
              <Text style={styles.selectIndicatorText}>✓</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.statsSection}>
        <Text style={styles.statsTitle}>Statistics</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Phases:</Text>
          <Text style={styles.statValue}>{markedPhases.length} / 6</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Duration:</Text>
          <Text style={styles.statValue}>
            {markedPhases
              .reduce((sum, phase) => sum + phase.duration, 0)
              .toFixed(2)}
            s
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Frames:</Text>
          <Text style={styles.statValue}>
            {markedPhases.reduce(
              (sum, phase) => sum + (phase.endFrame - phase.startFrame),
              0
            )}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Coverage:</Text>
          <Text style={styles.statValue}>
            {((markedPhases.length / 6) * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#ccc',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  phaseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  phaseCardSelected: {
    borderColor: '#007AFF',
  },
  phaseColorBar: {
    width: 4,
  },
  phaseCardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  phaseBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  phaseBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  phaseDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
  selectIndicator: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectIndicatorText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
});
