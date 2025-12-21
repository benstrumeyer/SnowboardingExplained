import { useState, useCallback } from 'react';

export interface MarkedPhase {
  phaseIndex: number;
  phaseName: string;
  startFrame: number;
  endFrame: number;
  startTimestamp: number;
  endTimestamp: number;
  duration: number;
}

const PHASE_NAMES = [
  'setupCarve',
  'windUp',
  'snap',
  'takeoff',
  'air',
  'landing',
];

export const usePhaseMarking = () => {
  const [markedPhases, setMarkedPhases] = useState<MarkedPhase[]>([]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [tempStartFrame, setTempStartFrame] = useState<number | null>(null);
  const [tempStartTimestamp, setTempStartTimestamp] = useState<number | null>(
    null
  );

  const markPhaseStart = useCallback(
    (frameNumber: number, timestamp: number) => {
      setTempStartFrame(frameNumber);
      setTempStartTimestamp(timestamp);
    },
    []
  );

  const markPhaseEnd = useCallback(
    (frameNumber: number, timestamp: number) => {
      if (tempStartFrame === null || tempStartTimestamp === null) {
        console.warn('Phase start not marked');
        return;
      }

      if (frameNumber <= tempStartFrame) {
        console.warn('End frame must be after start frame');
        return;
      }

      const phaseName = PHASE_NAMES[currentPhaseIndex];
      const duration = timestamp - tempStartTimestamp;

      const newPhase: MarkedPhase = {
        phaseIndex: currentPhaseIndex,
        phaseName,
        startFrame: tempStartFrame,
        endFrame: frameNumber,
        startTimestamp: tempStartTimestamp,
        endTimestamp: timestamp,
        duration,
      };

      setMarkedPhases((prev) => {
        // Replace if phase already exists at this index
        const filtered = prev.filter((p) => p.phaseIndex !== currentPhaseIndex);
        return [...filtered, newPhase].sort((a, b) => a.phaseIndex - b.phaseIndex);
      });

      // Move to next phase
      if (currentPhaseIndex < PHASE_NAMES.length - 1) {
        setCurrentPhaseIndex((prev) => prev + 1);
      }

      // Clear temp values
      setTempStartFrame(null);
      setTempStartTimestamp(null);
    },
    [tempStartFrame, tempStartTimestamp, currentPhaseIndex]
  );

  const editPhase = useCallback(
    (phaseIndex: number, startFrame: number, endFrame: number) => {
      if (startFrame >= endFrame) {
        console.warn('Start frame must be before end frame');
        return;
      }

      setMarkedPhases((prev) =>
        prev.map((phase) =>
          phase.phaseIndex === phaseIndex
            ? {
                ...phase,
                startFrame,
                endFrame,
                duration: (endFrame - startFrame) / 30, // Assuming 30 FPS
              }
            : phase
        )
      );
    },
    []
  );

  const deletePhase = useCallback((phaseIndex: number) => {
    setMarkedPhases((prev) => prev.filter((p) => p.phaseIndex !== phaseIndex));
  }, []);

  const clearAllPhases = useCallback(() => {
    setMarkedPhases([]);
    setCurrentPhaseIndex(0);
    setTempStartFrame(null);
    setTempStartTimestamp(null);
  }, []);

  const getPhaseByIndex = useCallback(
    (phaseIndex: number): MarkedPhase | undefined => {
      return markedPhases.find((p) => p.phaseIndex === phaseIndex);
    },
    [markedPhases]
  );

  const isPhaseMarked = useCallback(
    (phaseIndex: number): boolean => {
      return markedPhases.some((p) => p.phaseIndex === phaseIndex);
    },
    [markedPhases]
  );

  const getAllMarkedPhases = useCallback((): MarkedPhase[] => {
    return [...markedPhases].sort((a, b) => a.phaseIndex - b.phaseIndex);
  }, [markedPhases]);

  const getProgress = useCallback((): number => {
    return (markedPhases.length / PHASE_NAMES.length) * 100;
  }, [markedPhases]);

  return {
    markedPhases,
    currentPhaseIndex,
    tempStartFrame,
    tempStartTimestamp,
    markPhaseStart,
    markPhaseEnd,
    editPhase,
    deletePhase,
    clearAllPhases,
    getPhaseByIndex,
    isPhaseMarked,
    getAllMarkedPhases,
    getProgress,
    setCurrentPhaseIndex,
  };
};
