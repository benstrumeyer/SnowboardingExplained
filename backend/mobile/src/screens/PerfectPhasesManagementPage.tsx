import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchPerfectPhases,
  deletePerfectPhase,
} from '../store/thunks/perfectPhasesThunks';
import {
  setSearchQuery,
  setSelectedPhaseFilter,
  setSelectedStanceFilter,
  setFilteredPhases,
} from '../store/slices/perfectPhasesSlice';

interface PerfectPhasesManagementPageProps {
  onSelectPhase?: (phaseId: string) => void;
}

const PHASE_NAMES = [
  'Setup Carve',
  'Wind Up',
  'Snap',
  'Takeoff',
  'Air',
  'Landing',
];

export const PerfectPhasesManagementPage: React.FC<
  PerfectPhasesManagementPageProps
> = ({ onSelectPhase }) => {
  const dispatch = useAppDispatch();
  const phases = useAppSelector((state) => state.perfectPhases.phases);
  const filteredPhases = useAppSelector((state) => state.perfectPhases.filteredPhases);
  const isLoading = useAppSelector((state) => state.perfectPhases.isLoading);
  const error = useAppSelector((state) => state.perfectPhases.error);
  const searchQuery = useAppSelector((state) => state.perfectPhases.searchQuery);
  const selectedPhaseFilter = useAppSelector((state) => state.perfectPhases.selectedPhaseFilter);
  const selectedStanceFilter = useAppSelector((state) => state.perfectPhases.selectedStanceFilter);
  const isSubmitting = useAppSelector((state) => state.perfectPhases.isSubmitting);

  const filterPhases = useCallback(() => {
    let filtered = [...phases];

    if (searchQuery) {
      filtered = filtered.filter((phase) =>
        phase.trickName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedPhaseFilter) {
      filtered = filtered.filter(
        (phase) => phase.phaseName === selectedPhaseFilter
      );
    }

    if (selectedStanceFilter) {
      filtered = filtered.filter(
        (phase) => phase.stance === selectedStanceFilter
      );
    }

    dispatch(setFilteredPhases(filtered));
  }, [phases, searchQuery, selectedPhaseFilter, selectedStanceFilter, dispatch]);

  useEffect(() => {
    dispatch(fetchPerfectPhases({})).catch((error) => {
      console.warn('Failed to fetch perfect phases:', error);
      // Silently fail - show empty state
    });
  }, [dispatch]);

  useEffect(() => {
    filterPhases();
  }, [filterPhases]);

  const handleDeletePhase = (phaseId: string) => {
    Alert.alert(
      'Delete Perfect Phase',
      'Are you sure you want to delete this perfect phase?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: () => {
            dispatch(deletePerfectPhase(phaseId)).then((result) => {
              if (result.type === deletePerfectPhase.fulfilled.type) {
                Alert.alert('Success', 'Perfect phase deleted');
              }
            });
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence > 0.9) return '#34C759';
    if (confidence > 0.8) return '#FF9500';
    return '#FF3B30';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Perfect Phases Library</Text>
        <Text style={styles.subtitle}>
          {phases.length} perfect phases saved
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by trick name..."
          value={searchQuery}
          onChangeText={(text) => dispatch(setSearchQuery(text))}
          placeholderTextColor="#999"
        />
      </View>

      {/* Filter Controls */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            !selectedPhaseFilter && styles.filterButtonActive,
          ]}
          onPress={() => dispatch(setSelectedPhaseFilter(null))}
        >
          <Text
            style={[
              styles.filterButtonText,
              !selectedPhaseFilter && styles.filterButtonTextActive,
            ]}
          >
            All Phases
          </Text>
        </TouchableOpacity>

        {PHASE_NAMES.map((phase) => (
          <TouchableOpacity
            key={phase}
            style={[
              styles.filterButton,
              selectedPhaseFilter === phase && styles.filterButtonActive,
            ]}
            onPress={() => dispatch(setSelectedPhaseFilter(phase))}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedPhaseFilter === phase &&
                  styles.filterButtonTextActive,
              ]}
            >
              {phase}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[
            styles.filterButton,
            !selectedStanceFilter && styles.filterButtonActive,
          ]}
          onPress={() => dispatch(setSelectedStanceFilter(null))}
        >
          <Text
            style={[
              styles.filterButtonText,
              !selectedStanceFilter && styles.filterButtonTextActive,
            ]}
          >
            All Stances
          </Text>
        </TouchableOpacity>

        {['Regular', 'Goofy'].map((stance) => (
          <TouchableOpacity
            key={stance}
            style={[
              styles.filterButton,
              selectedStanceFilter === stance && styles.filterButtonActive,
            ]}
            onPress={() => dispatch(setSelectedStanceFilter(stance))}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedStanceFilter === stance &&
                  styles.filterButtonTextActive,
              ]}
            >
              {stance}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Phases List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : filteredPhases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No perfect phases found</Text>
          <Text style={styles.emptySubtext}>
            {error ? `Error: ${error}` : 'Try uploading and marking phases to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.phasesList}>
          {filteredPhases.map((phase) => (
            <TouchableOpacity
              key={phase.id}
              style={styles.phaseCard}
              onPress={() => onSelectPhase?.(phase.id)}
            >
              <View style={styles.phaseCardContent}>
                <View style={styles.phaseHeader}>
                  <Text style={styles.phaseTrick}>{phase.trickName}</Text>
                  <View style={styles.phaseBadges}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{phase.phaseName}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{phase.stance}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.phaseDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Frames:</Text>
                    <Text style={styles.detailValue}>{phase.frameCount}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Confidence:</Text>
                    <View
                      style={[
                        styles.confidenceBadge,
                        {
                          backgroundColor: getConfidenceColor(
                            phase.averageConfidence
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.confidenceBadgeText}>
                        {(phase.averageConfidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(phase.dateCreated).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePhase(phase.id)}
                disabled={isSubmitting}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
    textAlign: 'center',
  },
  phasesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  phaseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  phaseCardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  phaseHeader: {
    marginBottom: 8,
  },
  phaseTrick: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  phaseBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  phaseDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  confidenceBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
