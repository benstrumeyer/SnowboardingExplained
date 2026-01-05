# Design: PlaybackEngine Event-Based Architecture Refactor

## Overview

The PlaybackEngine is refactored into an event-based architecture where it serves as the single source of truth for all timing and playback state. The engine runs a deterministic RAF loop that advances playbackTime, syncs videos with drift tolerance, and provides frame indices for mesh rendering. React and Zustand become pure observers and controllers, never timing authorities.

**Architecture Principle:** Engine owns time, React observes time.

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PlaybackEngine (RAF Loop)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ playbackTime, isPlaying, playbackSpeed, isReversing  │   │
│  │ isLooping, frameIntervalMs, totalFrames              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  updateFrame() {                                             │
│    if (isPlaying) playbackTime += deltaTime * playbackSpeed │
│    handleLooping()                                           │
│    syncVideo(playbackTime)                                   │
│    frameIndex = getFrameIndex(playbackTime)                 │
│    updateMesh(frameIndex)                                    │
│    emit events on state changes                              │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    ┌─────────┐         ┌──────────┐        ┌──────────────┐
    │  Video  │         │   Mesh   │        │ React UI     │
    │ Element │         │ Sampler  │        │ Components   │
    └─────────┘         └──────────┘        └──────────────┘
    (reads time)        (reads frame)       (listens events)
```

### Component Interactions

1. **PlaybackEngine** - Central timing authority
   - Owns all playback state
   - Runs RAF loop at 60fps
   - Emits events on state changes
   - Provides direct property reads

2. **Video Elements** - Passive consumers
   - Synced via drift tolerance
   - Handles smooth rendering independently
   - Supports seeking in both directions

3. **Mesh Sampler** - Frame-driven consumer
   - Reads frameIndex directly each frame
   - Uses O(1) lookup for instant sync
   - Works with looping and reverse

4. **React UI** - Event-driven observer
   - Subscribes to engine events
   - Mirrors engine state for display
   - Sends commands to engine

## Components and Interfaces

### PlaybackEngine

```typescript
class PlaybackEngine {
  // State (private, read-only via properties)
  private playbackTime: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private isReversing: boolean = false;
  private isLooping: boolean = true;
  private frameIntervalMs: number;
  private totalFrames: number;
  private duration: number;
  private lastFrameTime: number = 0;
  private listeners: Set<PlaybackEventListener> = new Set();

  // Constructor
  constructor(fps: number, totalFrames: number) {
    this.frameIntervalMs = 1000 / fps;
    this.totalFrames = totalFrames;
    this.duration = (totalFrames / fps) * 1000;
    this.startRAFLoop();
  }

  // Public properties (read-only)
  get playbackTime(): number { return this.playbackTime; }
  get isPlaying(): boolean { return this.isPlaying; }
  get playbackSpeed(): number { return this.playbackSpeed; }
  get isReversing(): boolean { return this.isReversing; }
  get isLooping(): boolean { return this.isLooping; }

  // Control methods
  play(): void {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.emit({ type: 'play' });
    }
  }

  pause(): void {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.emit({ type: 'pause' });
    }
  }

  seek(time: number): void {
    this.playbackTime = Math.max(0, Math.min(time, this.duration));
    this.emit({ type: 'timeSet', time: this.playbackTime });
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = speed;
    this.isReversing = speed < 0;
    this.emit({ type: 'speedChanged', speed });
  }

  toggleReverse(): void {
    this.isReversing = !this.isReversing;
    this.playbackSpeed = Math.abs(this.playbackSpeed) * (this.isReversing ? -1 : 1);
    this.emit({ type: 'reverseToggled', isReversing: this.isReversing });
  }

  toggleLoop(): void {
    this.isLooping = !this.isLooping;
    this.emit({ type: 'loopToggled', isLooping: this.isLooping });
  }

  getFrameIndex(time: number): number {
    return Math.floor(time / this.frameIntervalMs) % this.totalFrames;
  }

  addEventListener(listener: PlaybackEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Private methods
  private startRAFLoop(): void {
    let lastTime = performance.now();
    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      if (this.isPlaying) {
        this.playbackTime += deltaTime * this.playbackSpeed;
        this.handleLooping();
      }

      this.syncVideo();
      this.updateMesh();
      this.emit({ type: 'frameUpdate' });

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private handleLooping(): void {
    if (this.isLooping) {
      if (this.playbackTime >= this.duration) {
        this.playbackTime = this.playbackTime % this.duration;
      } else if (this.playbackTime < 0) {
        this.playbackTime = this.duration + (this.playbackTime % this.duration);
      }
    } else {
      if (this.playbackTime < 0) this.playbackTime = 0;
      if (this.playbackTime > this.duration) this.playbackTime = this.duration;
    }
  }

  private syncVideo(): void {
    // Video sync handled by useVideoPlaybackSync hook
  }

  private updateMesh(): void {
    // Mesh update handled by useMeshSampler hook
  }

  private emit(event: PlaybackEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}
```

### Event Types

```typescript
type PlaybackEvent =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'timeSet'; time: number }
  | { type: 'speedChanged'; speed: number }
  | { type: 'reverseToggled'; isReversing: boolean }
  | { type: 'loopToggled'; isLooping: boolean }
  | { type: 'frameUpdate' };

type PlaybackEventListener = (event: PlaybackEvent) => void;
```

### useMeshSampler Hook

```typescript
function useMeshSampler(
  cellId: string,
  meshDataRef: React.RefObject<MeshFrameData[]>,
  fps: number,
  enabled: boolean,
  onFrameUpdate?: (frame: MeshFrameData) => void
) {
  useEffect(() => {
    if (!enabled || !meshDataRef.current || !onFrameUpdate) return;

    const engine = getGlobalPlaybackEngine();
    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        const frameIndex = engine.getFrameIndex(engine.playbackTime);
        const meshData = meshDataRef.current?.[frameIndex];
        if (meshData) {
          onFrameUpdate(meshData);
        }
      }
    });

    return unsubscribe;
  }, [cellId, fps, enabled, onFrameUpdate, meshDataRef]);
}
```

### useVideoPlaybackSync Hook

```typescript
function useVideoPlaybackSync(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const engine = getGlobalPlaybackEngine();
    const video = videoRef.current;

    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'play') {
        video.play();
      } else if (event.type === 'pause') {
        video.pause();
      } else if (event.type === 'timeSet') {
        video.currentTime = event.time / 1000;
      } else if (event.type === 'frameUpdate') {
        // Drift tolerance sync
        const targetTime = engine.playbackTime / 1000;
        const drift = Math.abs(video.currentTime - targetTime);
        if (drift > 0.0167) {
          video.currentTime = targetTime;
        }
      }
    });

    return unsubscribe;
  }, [videoRef, enabled]);
}
```

### SharedPlaybackControls Component

```typescript
function SharedPlaybackControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isReversing, setIsReversing] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  useEffect(() => {
    const engine = getGlobalPlaybackEngine();
    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'play') setIsPlaying(true);
      else if (event.type === 'pause') setIsPlaying(false);
      else if (event.type === 'speedChanged') setSpeed(event.speed);
      else if (event.type === 'reverseToggled') setIsReversing(event.isReversing);
      else if (event.type === 'loopToggled') setIsLooping(event.isLooping);
      else if (event.type === 'frameUpdate') setCurrentTime(engine.playbackTime);
    });

    return unsubscribe;
  }, []);

  const engine = getGlobalPlaybackEngine();

  return (
    <div className="shared-controls">
      <button onClick={() => engine.play()}>Play</button>
      <button onClick={() => engine.pause()}>Pause</button>
      <input
        type="range"
        value={currentTime}
        onChange={(e) => engine.seek(Number(e.target.value))}
      />
      <input
        type="range"
        min="0.5"
        max="2"
        step="0.1"
        value={Math.abs(speed)}
        onChange={(e) => engine.setSpeed(Number(e.target.value) * (isReversing ? -1 : 1))}
      />
      <button onClick={() => engine.toggleReverse()}>
        {isReversing ? 'Reverse' : 'Forward'}
      </button>
      <button onClick={() => engine.toggleLoop()}>
        {isLooping ? 'Loop On' : 'Loop Off'}
      </button>
    </div>
  );
}
```

## Data Models

### MeshFrameData

```typescript
interface MeshFrameData {
  frameNumber: number;
  vertices: Float32Array;
  faces: Uint32Array;
  camera: {
    tx: number;
    ty: number;
    tz: number;
    focal_length: number;
  };
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Frame Index Determinism

**For any** playbackTime value and any valid fps/totalFrames configuration, calling `getFrameIndex(playbackTime)` multiple times SHALL return the same frame index.

**Validates: Requirements 2.2, 2.3**

### Property 2: Looping Wrap-Around

**For any** playbackTime that exceeds duration when looping is enabled, the wrapped playbackTime SHALL be in range [0, duration).

**Validates: Requirements 5.2, 5.3**

### Property 3: Reverse Playback Symmetry

**For any** forward playback sequence from time A to time B, reversing from B back to A SHALL visit the same frames in opposite order.

**Validates: Requirements 4.1, 4.5, 4.6**

### Property 4: Video Drift Bounded

**For any** video element synced with engine, the drift between video.currentTime and engine.playbackTime SHALL never exceed 16.67ms (1 frame at 60fps) during normal playback.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Event Emission on State Change

**For any** state change in PlaybackEngine (play, pause, seek, speed, reverse, loop), THE engine SHALL emit exactly one corresponding event.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

### Property 6: Mesh-Video Frame Alignment

**For any** playbackTime value, the frameIndex calculated by engine.getFrameIndex(playbackTime) SHALL correspond to the same moment in time as video.currentTime = playbackTime / 1000.

**Validates: Requirements 2.1, 2.5, 3.4**

### Property 7: Looping Synchronization

**For any** looping playback, when playbackTime wraps around, both mesh and video SHALL wrap at exactly the same time.

**Validates: Requirements 5.8**

### Property 8: Unsubscribe Effectiveness

**For any** listener that calls the unsubscribe function returned by addEventListener, that listener SHALL no longer receive events after unsubscribe is called.

**Validates: Requirements 6.7, 6.8**

## Error Handling

- **Invalid playbackTime:** Clamp to [0, duration]
- **Invalid frameIndex:** Use modulo to wrap to valid range
- **Missing video element:** Skip video sync, continue mesh update
- **Missing mesh data:** Skip mesh update, continue playback
- **Listener errors:** Catch and log, continue emitting to other listeners

## Testing Strategy

### Unit Tests
- Frame index calculation with various fps and totalFrames values
- Looping wrap-around logic (forward and reverse)
- Event emission on state changes
- Drift tolerance calculations
- Unsubscribe functionality

### Property-Based Tests
- Frame index determinism (Property 1)
- Looping wrap-around correctness (Property 2)
- Reverse playback symmetry (Property 3)
- Video drift bounds (Property 4)
- Event emission completeness (Property 5)
- Mesh-video frame alignment (Property 6)
- Looping synchronization (Property 7)
- Unsubscribe effectiveness (Property 8)

