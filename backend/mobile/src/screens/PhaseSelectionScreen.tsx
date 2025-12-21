import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { submitPerfectPhase } from '../store/thunks/phaseThunks';
import { setFrameUris } from '../store/slices/videoSlice';

interface PhaseSelectionScreenProps {
  selectedPhaseIndex: number;
  onSuccess: () => void;
  onCancel: () => void;
  onUploadVideo?: () => void;
}

const PHASE_NAMES = [
  'Setup Carve',
  'Wind Up',
  'Snap',
  'Takeoff',
  'Air',
  'Landing',
];

const TRICK_NAMES = [
  'Backside 360',
  'Frontside 360',
  'Backside 180',
  'Frontside 180',
  'Kickflip',
  'Heelflip',
  'Backside 540',
  'Frontside 540',
];

const STANCES = ['Regular', 'Goofy'];

export const PhaseSelectionScreen: React.FC<PhaseSelectionScreenProps> = ({
  selectedPhaseIndex,
  onSuccess,
  onCancel,
  onUploadVideo,
}) => {
  const dispatch = useAppDispatch();
  const markedPhases = useAppSelector((state) => state.phase.markedPhases);
  const videoUri = useAppSelector((state) => state.video.videoUri);
  const isSubmitting = useAppSelector((state) => state.phase.isSubmitting);
  const submitError = useAppSelector((state) => state.phase.submitError);
  
  const selectedPhase = markedPhases.find((p) => p.phaseIndex === selectedPhaseIndex);
  
  const [trickName, setTrickName] = useState('');
  const [stance, setStance] = useState('');
  const [showTrickDropdown, setShowTrickDropdown] = useState(false);
  const [showStanceDropdown, setShowStanceDropdown] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!trickName) {
      newErrors.push('Trick name is required');
    }

    if (!stance) {
      newErrors.push('Stance is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    if (!selectedPhase || !videoUri) {
      Alert.alert('Error', 'Missing phase or video data');
      return;
    }

    dispatch(submitPerfectPhase({
      markedPhase: selectedPhase,
      trickName,
      stance,
      videoUri,
    })).then((result) => {
      if (result.type === submitPerfectPhase.fulfilled.type) {
        Alert.alert('Success', 'Perfect phase submitted');
        onSuccess();
      }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Select Phase Metadata</Text>
            <Text style={styles.subtitle}>
              {selectedPhase ? PHASE_NAMES[selectedPhase.phaseIndex] : 'Phase'} Phase
            </Text>
          </View>
          {onUploadVideo && (
            <TouchableOpacity
              style={styles.uploadHeaderButton}
              onPress={onUploadVideo}
            >
              <Text style={styles.uploadHeaderButtonText}>📁 Upload</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {selectedPhase && (
        <View style={styles.phaseInfoCard}>
          <Text style={styles.cardTitle}>Phase Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phase:</Text>
            <Text style={styles.infoValue}>
              {PHASE_NAMES[selectedPhase.phaseIndex]}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Frames:</Text>
            <Text style={styles.infoValue}>
              {selectedPhase.startFrame} - {selectedPhase.endFrame}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>
              {selectedPhase.duration.toFixed(2)}s
            </Text>
          </View>
        </View>
      )}

      <View style={styles.formSection}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Trick Name *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTrickDropdown(!showTrickDropdown)}
          >
            <Text
              style={[
                styles.dropdownText,
                !trickName && styles.dropdownPlaceholder,
              ]}
            >
              {trickName || 'Select a trick...'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {showTrickDropdown && (
            <View style={styles.dropdownMenu}>
              {TRICK_NAMES.map((trick) => (
                <TouchableOpacity
                  key={trick}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setTrickName(trick);
                    setShowTrickDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      trickName === trick && styles.dropdownItemSelected,
                    ]}
                  >
                    {trick}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Stance *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowStanceDropdown(!showStanceDropdown)}
          >
            <Text
              style={[
                styles.dropdownText,
                !stance && styles.dropdownPlaceholder,
              ]}
            >
              {stance || 'Select a stance...'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {showStanceDropdown && (
            <View style={styles.dropdownMenu}>
              {STANCES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setStance(s);
                    setShowStanceDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      stance === s && styles.dropdownItemSelected,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {errors.length > 0 && (
        <View style={styles.errorContainer}>
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      {submitError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>• {submitError}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Phase</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  uploadHeaderButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadHeaderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  phaseInfoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  formSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  dropdownText: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#999',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
