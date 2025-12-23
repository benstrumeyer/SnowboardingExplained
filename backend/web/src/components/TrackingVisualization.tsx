import { useState } from 'react';

// 33 MediaPipe keypoints with distinct colors
const KEYPOINT_COLORS: Record<number, string> = {
  0: '#FF0000', // nose
  1: '#FF7F00', // left eye
  2: '#FFFF00', // left ear
  3: '#00FF00', // left eye inner
  4: '#0000FF', // right eye
  5: '#4B0082', // right eye inner
  6: '#9400D3', // right ear
  7: '#FF1493', // mouth left
  8: '#FF69B4', // mouth right
  9: '#FFB6C1', // left shoulder
  10: '#FFC0CB', // right shoulder
  11: '#FF4500', // left elbow
  12: '#FF8C00', // right elbow
  13: '#FFA500', // left wrist
  14: '#FFD700', // right wrist
  15: '#ADFF2F', // left pinky
  16: '#7FFF00', // right pinky
  17: '#00FF7F', // left index
  18: '#00FFFF', // right index
  19: '#00CED1', // left thumb
  20: '#20B2AA', // right thumb
  21: '#008B8B', // left hip
  22: '#006666', // right hip
  23: '#0047AB', // left knee
  24: '#0066CC', // right knee
  25: '#0080FF', // left ankle
  26: '#00A0FF', // right ankle
  27: '#00BFFF', // left foot index
  28: '#00FFFF', // right foot index
  29: '#1E90FF', // left foot
  30: '#4169E1', // right foot
  31: '#6495ED', // left heel
  32: '#87CEEB', // right heel
};

const KEYPOINT_NAMES = [
  'Nose', 'Left Eye', 'Left Ear', 'Left Eye Inner', 'Right Eye', 'Right Eye Inner', 'Right Ear',
  'Mouth Left', 'Mouth Right', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Pinky', 'Right Pinky', 'Left Index', 'Right Index',
  'Left Thumb', 'Right Thumb', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee',
  'Left Ankle', 'Right Ankle', 'Left Foot Index', 'Right Foot Index', 'Left Foot', 'Right Foot',
  'Left Heel', 'Right Heel'
];

interface TrackingVisualizationProps {
  onTrackingToggle?: (keypointIndex: number, enabled: boolean) => void;
}

export function TrackingVisualization({ onTrackingToggle }: TrackingVisualizationProps) {
  const [enabledKeypoints, setEnabledKeypoints] = useState<Set<number>>(new Set());

  const handleToggle = (index: number) => {
    const newEnabled = new Set(enabledKeypoints);
    if (newEnabled.has(index)) {
      newEnabled.delete(index);
    } else {
      newEnabled.add(index);
    }
    setEnabledKeypoints(newEnabled);
    onTrackingToggle?.(index, newEnabled.has(index));
  };

  const handleSelectAll = () => {
    const allKeypoints = new Set(Array.from({ length: 33 }, (_, i) => i));
    setEnabledKeypoints(allKeypoints);
    for (let i = 0; i < 33; i++) {
      onTrackingToggle?.(i, true);
    }
  };

  const handleClearAll = () => {
    setEnabledKeypoints(new Set());
    for (let i = 0; i < 33; i++) {
      onTrackingToggle?.(i, false);
    }
  };

  return (
    <div style={{ padding: '10px', background: '#222', color: '#fff' }}>
      <h3>Body Part Tracking</h3>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleSelectAll} style={{ marginRight: '5px' }}>
          Select All
        </button>
        <button onClick={handleClearAll}>Clear All</button>
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {Array.from({ length: 33 }, (_, i) => (
          <div key={i} style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={enabledKeypoints.has(i)}
              onChange={() => handleToggle(i)}
              id={`keypoint-${i}`}
            />
            <label htmlFor={`keypoint-${i}`} style={{ marginLeft: '5px', flex: 1 }}>
              {KEYPOINT_NAMES[i]}
            </label>
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: KEYPOINT_COLORS[i],
                borderRadius: '3px',
                marginLeft: '5px',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
