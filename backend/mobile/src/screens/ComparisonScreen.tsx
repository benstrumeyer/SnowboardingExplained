import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { config } from '../config';

interface SignalDelta {
  signal: string;
  peakDelta: string;
  peakTimingDelta: string;
  direction: 'rider_higher' | 'rider_lower' | 'neutral';
}

interface Archetype {
  archetype: string;
  confidence: string;
  coachingTip: string;
  severity: 'minor' | 'moderate' | 'critical';
}

interface PhaseComparison {
  similarity: string;
  topDeltas: SignalDelta[];
  topArchetypes: Archetype[];
}

interface ComparisonResult {
  riderVideoId: string;
  referenceVideoId: string;
  overallSimilarity: string;
  phases: {
    [key: string]: PhaseComparison;
  };
  topIssues: Array<{
    phase: string;
    archetype: string;
    confidence: string;
    coachingTip: string;
    severity: string;
  }>;
}

interface ComparisonScreenProps {
  riderVideoId: string;
  referenceVideoId: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const ComparisonScreen: React.FC<ComparisonScreenProps> = ({
  riderVideoId,
  referenceVideoId,
  onClose,
}) => {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [riderVideoId, referenceVideoId]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${config.API_BASE_URL}/comparison/${riderVideoId}/${referenceVideoId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load comparison: ${response.statusText}`);
      }

      const data = await response.json();
      setComparison(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading comparison...</Text>
      </View>
    );
  }

  if (error || !comparison) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error || 'Failed to load comparison'}</Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const phases = Object.keys(comparison.phases);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Form Comparison</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Overall Similarity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Similarity</Text>
        <View style={styles.similarityContainer}>
          <Text style={styles.similarityScore}>{comparison.overallSimilarity}%</Text>
          <View style={styles.similarityBar}>
            <View
              style={[
                styles.similarityFill,
                { width: `${Math.min(parseInt(comparison.overallSimilarity), 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Top Issues */}
      {comparison.topIssues.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Issues</Text>
          {comparison.topIssues.map((issue, idx) => (
            <View key={idx} style={styles.issueItem}>
              <View style={styles.issueHeader}>
                <Text style={styles.issuePhase}>{issue.phase}</Text>
                <Text
                  style={[
                    styles.issueSeverity,
                    {
                      color:
                        issue.severity === 'critical'
                          ? '#d32f2f'
                          : issue.severity === 'moderate'
                            ? '#f57c00'
                            : '#388e3c',
                    },
                  ]}
                >
                  {issue.severity}
                </Text>
              </View>
              <Text style={styles.issueArchetype}>{issue.archetype}</Text>
              <Text style={styles.issueTip}>{issue.coachingTip}</Text>
              <Text style={styles.issueConfidence}>Confidence: {issue.confidence}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* Phase Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phase Breakdown</Text>
        {phases.map((phase) => (
          <TouchableOpacity
            key={phase}
            style={styles.phaseButton}
            onPress={() => setSelectedPhase(selectedPhase === phase ? null : phase)}
          >
            <View style={styles.phaseHeader}>
              <Text style={styles.phaseName}>{phase}</Text>
              <Text style={styles.phaseSimilarity}>
                {comparison.phases[phase].similarity}%
              </Text>
            </View>

            {/* Expanded Phase Details */}
            {selectedPhase === phase && (
              <View style={styles.phaseDetails}>
                {/* Top Deltas */}
                {comparison.phases[phase].topDeltas.length > 0 && (
                  <View style={styles.deltaSection}>
                    <Text style={styles.sectionTitle}>Signal Deltas</Text>
                    {comparison.phases[phase].topDeltas.map((delta, idx) => (
                      <View key={idx} style={styles.deltaItem}>
                        <Text style={styles.deltaSignal}>{delta.signal}</Text>
                        <Text style={styles.deltaValue}>
                          Peak: {delta.peakDelta} ({delta.direction})
                        </Text>
                        <Text style={styles.deltaValue}>
                          Timing: {delta.peakTimingDelta}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Top Archetypes */}
                {comparison.phases[phase].topArchetypes.length > 0 && (
                  <View style={styles.archetypeSection}>
                    <Text style={styles.sectionTitle}>Coaching Patterns</Text>
                    {comparison.phases[phase].topArchetypes.map((arch, idx) => (
                      <View key={idx} style={styles.archetypeItem}>
                        <Text style={styles.archetypeName}>{arch.archetype}</Text>
                        <Text style={styles.archetypeConfidence}>
                          {arch.confidence}% confidence
                        </Text>
                        <Text style={styles.archetypeTip}>{arch.coachingTip}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButtonLarge} onPress={onClose}>
        <Text style={styles.buttonText}>Close Comparison</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
    padding: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  similarityContainer: {
    alignItems: 'center',
  },
  similarityScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 12,
  },
  similarityBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  similarityFill: {
    height: '100%',
    backgroundColor: '#0066cc',
  },
  issueItem: {
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#f57c00',
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  issuePhase: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  issueSeverity: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  issueArchetype: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 4,
  },
  issueTip: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    lineHeight: 18,
  },
  issueConfidence: {
    fontSize: 12,
    color: '#999',
  },
  phaseButton: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  phaseSimilarity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  phaseDetails: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 12,
  },
  deltaSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  deltaItem: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  deltaSignal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deltaValue: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  archetypeSection: {
    marginBottom: 16,
  },
  archetypeItem: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0066cc',
  },
  archetypeName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 4,
  },
  archetypeConfidence: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  archetypeTip: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButtonLarge: {
    backgroundColor: '#0066cc',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
