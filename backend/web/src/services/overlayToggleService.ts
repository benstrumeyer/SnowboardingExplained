/**
 * Overlay Toggle Service
 * Manages overlay toggle state per scene
 * Maintains frame index without interruption during toggle
 */

export interface OverlayToggleState {
  sceneId: string;
  isOverlayEnabled: boolean;
  frameIndex: number;
}

type OverlayToggleCallback = (isEnabled: boolean) => void;

export class OverlayToggleService {
  private toggleStates: Map<string, OverlayToggleState> = new Map();
  private toggleCallbacks: Map<string, Set<OverlayToggleCallback>> = new Map();

  /**
   * Initialize overlay toggle for a scene
   */
  initializeOverlay(sceneId: string, initialState: boolean = true): void {
    this.toggleStates.set(sceneId, {
      sceneId,
      isOverlayEnabled: initialState,
      frameIndex: 0
    });

    this.toggleCallbacks.set(sceneId, new Set());
  }

  /**
   * Toggle overlay for a scene
   * Maintains current frame index without interruption
   */
  toggleOverlay(sceneId: string): boolean {
    const state = this.toggleStates.get(sceneId);
    if (!state) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    // Toggle state
    state.isOverlayEnabled = !state.isOverlayEnabled;

    // Notify subscribers
    this.notifyToggleChange(sceneId, state.isOverlayEnabled);

    return state.isOverlayEnabled;
  }

  /**
   * Set overlay state explicitly
   */
  setOverlayEnabled(sceneId: string, enabled: boolean): void {
    const state = this.toggleStates.get(sceneId);
    if (!state) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    if (state.isOverlayEnabled !== enabled) {
      state.isOverlayEnabled = enabled;
      this.notifyToggleChange(sceneId, enabled);
    }
  }

  /**
   * Get overlay state for a scene
   */
  isOverlayEnabled(sceneId: string): boolean {
    const state = this.toggleStates.get(sceneId);
    if (!state) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    return state.isOverlayEnabled;
  }

  /**
   * Update frame index for a scene
   * Called when playback advances
   */
  updateFrameIndex(sceneId: string, frameIndex: number): void {
    const state = this.toggleStates.get(sceneId);
    if (!state) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    state.frameIndex = frameIndex;
  }

  /**
   * Get current frame index for a scene
   */
  getFrameIndex(sceneId: string): number {
    const state = this.toggleStates.get(sceneId);
    if (!state) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    return state.frameIndex;
  }

  /**
   * Subscribe to overlay toggle changes
   */
  onOverlayToggle(sceneId: string, callback: OverlayToggleCallback): () => void {
    if (!this.toggleCallbacks.has(sceneId)) {
      this.toggleCallbacks.set(sceneId, new Set());
    }

    const callbacks = this.toggleCallbacks.get(sceneId)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
    };
  }

  /**
   * Get overlay state for all scenes
   */
  getAllToggleStates(): OverlayToggleState[] {
    return Array.from(this.toggleStates.values());
  }

  /**
   * Get overlay state for a specific scene
   */
  getToggleState(sceneId: string): OverlayToggleState {
    const state = this.toggleStates.get(sceneId);
    if (!state) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    return { ...state };
  }

  /**
   * Notify subscribers of toggle change
   */
  private notifyToggleChange(sceneId: string, isEnabled: boolean): void {
    const callbacks = this.toggleCallbacks.get(sceneId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(isEnabled);
        } catch (error) {
          console.error(`Error in overlay toggle callback for ${sceneId}:`, error);
        }
      }
    }
  }

  /**
   * Remove scene
   */
  removeScene(sceneId: string): void {
    this.toggleStates.delete(sceneId);
    this.toggleCallbacks.delete(sceneId);
  }

  /**
   * Clear all scenes
   */
  clear(): void {
    this.toggleStates.clear();
    this.toggleCallbacks.clear();
  }
}

// Singleton instance
let instance: OverlayToggleService | null = null;

export function initializeOverlayToggleService(): OverlayToggleService {
  instance = new OverlayToggleService();
  return instance;
}

export function getOverlayToggleService(): OverlayToggleService {
  if (!instance) {
    instance = new OverlayToggleService();
  }
  return instance;
}
