/**
 * Analysis Panel Component
 * Displays MCP tool results and analysis logs for the current frame
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export interface ToolResult {
  toolName: string;
  result: Record<string, any>;
  confidence: number;
}

export interface FrameAnalysisData {
  frameNumber: number;
  timestamp: number;
  phase: string;
  toolResults: Record<string, any>;
  confidence: number;
}

export interface MCPToolCall {
  toolName: string;
  frameNumber: number;
  parameters: Record<string, any>;
  result: Record<string, any>;
  confidence: number;
  timestamp: number;
  processingTimeMs: number;
}

export interface AnalysisLogData {
  mcpToolCalls: MCPToolCall[];
  stateTransitions: Array<{
    fromPhase: string;
    toPhase: string;
    frameNumber: number;
    timestamp: number;
    confidence: number;
  }>;
  phaseAnalysis: Array<{
    phase: string;
    frameRange: { start: number; end: number };
    keyFindings: string[];
    mcpToolResults: Record<string, any>;
  }>;
  summary: string;
  totalProcessingTimeMs: number;
}

interface AnalysisPanelProps {
  currentFrameAnalysis: FrameAnalysisData | null;
  analysisLog: AnalysisLogData | null;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  currentFrameAnalysis,
  analysisLog,
}) => {
  const [showFullLog, setShowFullLog] = useState(false);

  const renderToolResult = (name: string, result: any) => {
    if (!result || typeof result !== 'object') {
      return (
        <View key={name} style={styles.toolResultItem}>
          <Text style={styles.toolName}>{formatToolName(name)}</Text>
          <Text style={styles.toolValue}>{String(result)}</Text>
        </View>
      );
    }

    // Format specific tool results
    let displayValue = '';
    let confidence = result.confidence || 0;

    switch (name) {
      case 'stance':
        displayValue = result.stance || 'unknown';
        break;
      case 'edge':
        displayValue = result.edge || 'unknown';
        break;
      case 'legBend':
        displayValue = result.averageBend 
          ? `${result.averageBend.toFixed(1)}° ${result.isStraightLegs ? '(straight!)' : ''}`
          : 'unknown';
        break;
      case 'bodyStack':
        displayValue = result.isStacked 
          ? `Stacked (${result.weightDistribution})`
          : `Not stacked (${result.weightDistribution})`;
        break;
      case 'upperRotation':
        displayValue = result.rotation 
          ? `${result.rotation} (${result.degreesSeparation?.toFixed(1)}°)`
          : 'unknown';
        break;
      default:
        displayValue = JSON.stringify(result, null, 2);
    }

    return (
      <View key={name} style={styles.toolResultItem}>
        <Text style={styles.toolName}>{formatToolName(name)}</Text>
        <View style={styles.toolValueContainer}>
          <Text style={styles.toolValue}>{displayValue}</Text>
          {confidence > 0 && (
            <View style={[styles.confidenceBadge, getConfidenceStyle(confidence)]}>
              <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const formatToolName = (name: string): string => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getConfidenceStyle = (confidence: number) => {
    if (confidence > 0.7) return styles.confidenceHigh;
    if (confidence > 0.3) return styles.confidenceMedium;
    return styles.confidenceLow;
  };

  const renderFullLog = () => {
    if (!analysisLog) return null;

    return (
      <View style={styles.fullLogContainer}>
        <Text style={styles.sectionTitle}>Full Analysis Log</Text>
        
        {/* Summary */}
        <View style={styles.logSection}>
          <Text style={styles.logSectionTitle}>Summary</Text>
          <Text style={styles.logText}>{analysisLog.summary}</Text>
        </View>

        {/* Tool Calls */}
        <View style={styles.logSection}>
          <Text style={styles.logSectionTitle}>
            MCP Tool Calls ({analysisLog.mcpToolCalls.length})
          </Text>
          {analysisLog.mcpToolCalls.slice(0, 20).map((call, index) => (
            <View key={index} style={styles.toolCallItem}>
              <Text style={styles.toolCallName}>
                {call.toolName} (Frame {call.frameNumber})
              </Text>
              <Text style={styles.toolCallResult}>
                {JSON.stringify(call.result, null, 2)}
              </Text>
              <Text style={styles.toolCallMeta}>
                Confidence: {Math.round(call.confidence * 100)}% | {call.processingTimeMs}ms
              </Text>
            </View>
          ))}
          {analysisLog.mcpToolCalls.length > 20 && (
            <Text style={styles.moreText}>
              ... and {analysisLog.mcpToolCalls.length - 20} more calls
            </Text>
          )}
        </View>

        {/* State Transitions */}
        {analysisLog.stateTransitions.length > 0 && (
          <View style={styles.logSection}>
            <Text style={styles.logSectionTitle}>State Transitions</Text>
            {analysisLog.stateTransitions.map((transition, index) => (
              <Text key={index} style={styles.transitionText}>
                Frame {transition.frameNumber}: {transition.fromPhase} → {transition.toPhase}
              </Text>
            ))}
          </View>
        )}

        {/* Processing Time */}
        <View style={styles.logSection}>
          <Text style={styles.logSectionTitle}>Performance</Text>
          <Text style={styles.logText}>
            Total processing time: {analysisLog.totalProcessingTimeMs}ms
          </Text>
        </View>
      </View>
    );
  };

  if (!currentFrameAnalysis) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No analysis data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Frame Analysis */}
      <View style={styles.currentFrameSection}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Frame Analysis</Text>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseText}>{currentFrameAnalysis.phase}</Text>
          </View>
        </View>

        {/* Tool Results */}
        <View style={styles.toolResultsContainer}>
          {Object.entries(currentFrameAnalysis.toolResults).map(([name, result]) =>
            renderToolResult(name, result)
          )}
        </View>

        {/* Overall Confidence */}
        <View style={styles.overallConfidence}>
          <Text style={styles.confidenceLabel}>Overall Confidence:</Text>
          <View style={[styles.confidenceBadge, getConfidenceStyle(currentFrameAnalysis.confidence)]}>
            <Text style={styles.confidenceText}>
              {Math.round(currentFrameAnalysis.confidence * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Toggle Full Log */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowFullLog(!showFullLog)}
      >
        <Text style={styles.toggleButtonText}>
          {showFullLog ? '▲ Hide Full Log' : '▼ Show Full Log'}
        </Text>
      </TouchableOpacity>

      {/* Full Log (Expandable) */}
      {showFullLog && (
        <ScrollView style={styles.fullLogScroll} nestedScrollEnabled>
          {renderFullLog()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
  currentFrameSection: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  phaseBadge: {
    backgroundColor: '#00BFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  toolResultsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  toolResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  toolName: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  toolValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  toolValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confidenceHigh: {
    backgroundColor: '#00FF00',
  },
  confidenceMedium: {
    backgroundColor: '#FFFF00',
  },
  confidenceLow: {
    backgroundColor: '#FF0000',
  },
  confidenceText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  overallConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  confidenceLabel: {
    color: '#888',
    fontSize: 12,
    marginRight: 8,
  },
  toggleButton: {
    backgroundColor: 'rgba(0, 191, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#00BFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fullLogScroll: {
    maxHeight: 400,
    marginTop: 12,
  },
  fullLogContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  logSection: {
    marginBottom: 16,
  },
  logSectionTitle: {
    color: '#00BFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  logText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  toolCallItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  toolCallName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolCallResult: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  toolCallMeta: {
    color: '#666',
    fontSize: 10,
  },
  moreText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  transitionText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
});

export default AnalysisPanel;
