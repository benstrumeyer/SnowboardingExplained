/**
 * Property-based tests for PlaybackSyncService
 * Feature: synchronized-video-mesh-playback
 * Property 1: Independent Frame Position Maintenance
 * Property 2: Playback Speed Consistency
 * Validates: Requirements 6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PlaybackSyncService } from '../playbackSyncService';

// Arbitraries for property-based testing
const videoIdArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const frameIndexArbitrary = fc.integer({ min: 0, max: 1000 });
const playbackSpeedArbitrary = fc.float({ min: 0.1, max: 4.0, noNaN: true });

describe('PlaybackSyncService Properties', () => {
  let service: PlaybackSyncService;

  beforeEach(() => {
    service = new PlaybackSyncService({ fps: 30 });
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Property 1: Independent Frame Position Maintenance', () => {
    it('should maintain each scene\'s independent frame index while advancing at same rate', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          frameIndexArbitrary,
          async (videoIds, initialOffset) => {
            // Initialize playback
            await service.initializePlayback(videoIds, 30);

            // Set different initial frame positions
            for (let i = 0; i < videoIds.length; i++) {
              service.setSceneFrameIndex(videoIds[i], initialOffset + i);
            }

            // Start playback
            service.play();

            // Advance frames
            const advanceCount = 5;
            for (let i = 0; i < advanceCount; i++) {
              service.advanceFrame();
            }

            // Verify each scene advanced by same amount but maintains independent position
            for (let i = 0; i < videoIds.length; i++) {
              const currentFrame = service.getSceneFrameIndex(videoIds[i]);
              const expectedFrame = initialOffset + i + advanceCount;
              expect(currentFrame).toBe(expectedFrame);
            }

            service.pause();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain independent frame positions across multiple advance cycles', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          async (videoIds) => {
            await service.initializePlayback(videoIds, 30);

            // Set different initial positions
            const initialPositions = new Map<string, number>();
            for (let i = 0; i < videoIds.length; i++) {
              initialPositions.set(videoIds[i], i * 10);
              service.setSceneFrameIndex(videoIds[i], i * 10);
            }

            service.play();

            // Multiple advance cycles
            for (let cycle = 0; cycle < 3; cycle++) {
              for (let i = 0; i < 5; i++) {
                service.advanceFrame();
              }

              // Verify positions are maintained relative to each other
              for (let i = 0; i < videoIds.length; i++) {
                const currentFrame = service.getSceneFrameIndex(videoIds[i]);
                const initialFrame = initialPositions.get(videoIds[i])!;
                const expectedFrame = initialFrame + (cycle + 1) * 5;
                expect(currentFrame).toBe(expectedFrame);
              }
            }

            service.pause();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain independent positions when paused and resumed', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          async (videoIds) => {
            await service.initializePlayback(videoIds, 30);

            // Set different initial positions
            for (let i = 0; i < videoIds.length; i++) {
              service.setSceneFrameIndex(videoIds[i], i * 5);
            }

            // Play and advance
            service.play();
            for (let i = 0; i < 3; i++) {
              service.advanceFrame();
            }

            // Pause
            service.pause();

            // Verify positions are maintained
            const pausedPositions = new Map<string, number>();
            for (const videoId of videoIds) {
              pausedPositions.set(videoId, service.getSceneFrameIndex(videoId));
            }

            // Resume and advance
            service.play();
            for (let i = 0; i < 2; i++) {
              service.advanceFrame();
            }

            // Verify positions advanced correctly
            for (const videoId of videoIds) {
              const currentFrame = service.getSceneFrameIndex(videoId);
              const pausedFrame = pausedPositions.get(videoId)!;
              expect(currentFrame).toBe(pausedFrame + 2);
            }

            service.pause();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 2: Playback Speed Consistency', () => {
    it('should apply speed change to all scenes simultaneously', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          playbackSpeedArbitrary,
          async (videoIds, speed) => {
            await service.initializePlayback(videoIds, 30);

            // Set playback speed
            service.setPlaybackSpeed(speed);

            // Verify all scenes have same speed
            const states = service.getAllSceneStates();
            for (const state of states) {
              expect(state.speed).toBe(speed);
            }

            // Verify global state
            const globalState = service.getGlobalState();
            expect(globalState.speed).toBe(speed);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain speed consistency across multiple speed changes', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          fc.array(playbackSpeedArbitrary, { minLength: 1, maxLength: 5 }),
          async (videoIds, speeds) => {
            await service.initializePlayback(videoIds, 30);

            for (const speed of speeds) {
              service.setPlaybackSpeed(speed);

              // Verify all scenes have same speed
              const states = service.getAllSceneStates();
              for (const state of states) {
                expect(state.speed).toBe(speed);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject invalid playback speeds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -10, max: 0, noNaN: true }),
          async (invalidSpeed) => {
            expect(() => {
              service.setPlaybackSpeed(invalidSpeed);
            }).toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 3: Frame Seek Offset Consistency', () => {
    it('should advance all scenes by same offset without forcing same frame index', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          frameIndexArbitrary,
          fc.integer({ min: -100, max: 100 }),
          async (videoIds, initialOffset, seekOffset) => {
            await service.initializePlayback(videoIds, 30);

            // Set different initial positions
            for (let i = 0; i < videoIds.length; i++) {
              service.setSceneFrameIndex(videoIds[i], initialOffset + i);
            }

            // Seek by offset
            await service.seekByOffset(seekOffset);

            // Verify all scenes advanced by same offset
            for (let i = 0; i < videoIds.length; i++) {
              const currentFrame = service.getSceneFrameIndex(videoIds[i]);
              const expectedFrame = Math.max(0, initialOffset + i + seekOffset);
              expect(currentFrame).toBe(expectedFrame);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should clamp negative frame indices to zero', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          async (videoIds) => {
            await service.initializePlayback(videoIds, 30);

            // Set initial positions
            for (let i = 0; i < videoIds.length; i++) {
              service.setSceneFrameIndex(videoIds[i], i + 2);
            }

            // Seek backward beyond zero
            await service.seekByOffset(-100);

            // Verify all frames are clamped to zero
            for (const videoId of videoIds) {
              const currentFrame = service.getSceneFrameIndex(videoId);
              expect(currentFrame).toBe(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Frame Change Callbacks', () => {
    it('should notify subscribers of frame changes', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 1, maxLength: 3 }),
          async (videoIds) => {
            await service.initializePlayback(videoIds, 30);

            const frameChanges = new Map<string, number[]>();

            // Subscribe to frame changes
            for (const videoId of videoIds) {
              frameChanges.set(videoId, []);
              service.onSceneFrameChange(videoId, (frameIndex) => {
                frameChanges.get(videoId)!.push(frameIndex);
              });
            }

            // Advance frames
            service.play();
            for (let i = 0; i < 3; i++) {
              service.advanceFrame();
            }
            service.pause();

            // Verify callbacks were called
            for (const videoId of videoIds) {
              const changes = frameChanges.get(videoId)!;
              expect(changes.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
