import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PoseData } from '../services/poseAnalysisService';

interface SummaryPanelProps {
  poseData: PoseData;
  phaseReasoning: string;
  mcpToolOutputs?: { toolName: string; output: any }[];
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  poseData,
  phaseReasoning,
  mcpToolOutputs = [],
}) => {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    reasoning: true,
    signals: true,
    mcp: true,
    joints: false,
    angles: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getSignalStatusColor = (status: string): string => {
    switch (status) {
      case 'good':
        return '#34C759';
      case 'warning':
        return '#FF9500';
      case 'critical':
        return '#FF3B30';
      default:
        return '#999';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Phase Reasoning Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('reasoning')}
        >
          <Text style={styles.sectionTitle}>Phase Reasoning</Text>
          <Text style={styles.expandIcon}>
            {expandedSections.reasoning ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections.reasoning && (
          <View style={styles.sectionContent}>
            <Text style={styles.reasoningText}>{phaseReasoning}</Text>
          </View>
        )}
      </View>

      {/* Detection Signals Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('signals')}
        >
          <Text style={styles.sectionTitle}>Detection Signals</Text>
          <Text style={styles.expandIcon}>
            {expandedSections.signals ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections.signals && (
          <View style={styles.sectionContent}>
            {poseData.detectionSignals.map((signal, index) => (
              <View key={index} style={styles.signalRow}>
                <View style={styles.signalInfo}>
                  <Text style={styles.signalName}>{signal.name}</Text>
                  <Text style={styles.signalThreshold}>
                    Threshold: {signal.threshold.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.signalValue}>
                  <Text
                    style={[
                      styles.signalValueText,
                      {
                        color: getSignalStatusColor(signal.status),
                      },
                    ]}
                  >
                    {signal.value.toFixed(2)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getSignalStatusColor(signal.status),
                      },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{signal.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* MCP Tool Outputs Section */}
      {mcpToolOutputs.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('mcp')}
          >
            <Text style={styles.sectionTitle}>MCP Tool Outputs</Text>
            <Text style={styles.expandIcon}>
              {expandedSections.mcp ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections.mcp && (
            <View style={styles.sectionContent}>
              {mcpToolOutputs.map((tool, index) => (
                <View key={index} style={styles.mcpToolRow}>
                  <Text style={styles.mcpToolName}>{tool.toolName}</Text>
                  <Text style={styles.mcpToolOutput}>
                    {JSON.stringify(tool.output, null, 2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Joint Positions Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('joints')}
        >
          <Text style={styles.sectionTitle}>Joint Positions</Text>
          <Text style={styles.expandIcon}>
            {expandedSections.joints ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections.joints && (
          <View style={styles.sectionContent}>
            {poseData.joints.map((joint, index) => (
              <View key={index} style={styles.jointRow}>
                <Text style={styles.jointName}>{joint.name}</Text>
                <View style={styles.jointCoords}>
                  <Text style={styles.coordText}>
                    X: {joint.x.toFixed(1)}
                  </Text>
                  <Text style={styles.coordText}>
                    Y: {joint.y.toFixed(1)}
                  </Text>
                  <Text style={styles.coordText}>
                    Z: {joint.z.toFixed(1)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor:
                        joint.confidence > 0.85
                          ? '#34C759'
                          : joint.confidence > 0.7
                          ? '#FF9500'
                          : '#FF3B30',
                    },
                  ]}
                >
                  <Text style={styles.confidenceBadgeText}>
                    {(joint.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Joint Angles Section */}
      {poseData.angles.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('angles')}
          >
            <Text style={styles.sectionTitle}>Joint Angles</Text>
            <Text style={styles.expandIcon}>
              {expandedSections.angles ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections.angles && (
            <View style={styles.sectionContent}>
              {poseData.angles.map((angle, index) => (
                <View key={index} style={styles.angleRow}>
                  <Text style={styles.angleName}>{angle.name}</Text>
                  <View style={styles.angleValue}>
                    <Text style={styles.angleValueText}>
                      {angle.angle.toFixed(1)}°
                    </Text>
                    <View
                      style={[
                        styles.confidenceBadge,
                        {
                          backgroundColor:
                            angle.confidence > 0.85
                              ? '#34C759'
                              : angle.confidence > 0.7
                              ? '#FF9500'
                              : '#FF3B30',
                        },
                      ]}
                    >
                      <Text style={styles.confidenceBadgeText}>
                        {(angle.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Overall Confidence Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overall Confidence</Text>
        </View>
        <View style={styles.sectionContent}>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                { width: `${poseData.overallConfidence * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.confidenceText}>
            {(poseData.overallConfidence * 100).toFixed(1)}%
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
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  expandIcon: {
    fontSize: 10,
    color: '#999',
  },
  sectionContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  reasoningText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  signalInfo: {
    flex: 1,
  },
  signalName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  signalThreshold: {
    fontSize: 10,
    color: '#999',
  },
  signalValue: {
    alignItems: 'flex-end',
    gap: 4,
  },
  signalValueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  mcpToolRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mcpToolName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  mcpToolOutput: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  jointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  jointName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  jointCoords: {
    flex: 1,
    gap: 2,
  },
  coordText: {
    fontSize: 10,
    color: '#666',
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 8,
  },
  confidenceBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  angleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  angleName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  angleValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  angleValueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
});
