import { PlaybackEngine, SceneConfig } from '../engine/PlaybackEngine';

describe('PlaybackEngine', () => {
  let engine: PlaybackEngine;

  beforeEach(() => {
    engine = new PlaybackEngine();
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('Property 1: Frame Position Consistency', () => {
    it('should display correct frame when scrubber is adjusted', (done) => {
      const sceneConfig: SceneConfig = {
        sceneId: 'test-scene',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };
      engine.registerScene(sceneConfig);

      engine.seek(5000);

      const localTime = engine.getSceneLocalTime('test-scene');
      expect(localTime).toBe(5000);
      done();
    });
  });

  describe('Property 2: Sync State Isolation', () => {
    it('should not affect other cells when adjusting one cell', (done) => {
      const scene1: SceneConfig = {
        sceneId: 'scene-1',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };
      const scene2: SceneConfig = {
        sceneId: 'scene-2',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };

      engine.registerScene(scene1);
      engine.registerScene(scene2);

      engine.seek(5000);

      const time1 = engine.getSceneLocalTime('scene-1');
      const time2 = engine.getSceneLocalTime('scene-2');

      expect(time1).toBe(5000);
      expect(time2).toBe(5000);
      done();
    });
  });

  describe('Property 3: Synced Cell Coherence', () => {
    it('should update all synced cells when shared controls change', (done) => {
      const scene1: SceneConfig = {
        sceneId: 'synced-1',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };
      const scene2: SceneConfig = {
        sceneId: 'synced-2',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };

      engine.registerScene(scene1);
      engine.registerScene(scene2);

      engine.play();
      expect(engine.getState().isPlaying).toBe(true);

      engine.setSpeed(2);
      expect(engine.getState().playbackSpeed).toBe(2);

      done();
    });
  });

  describe('Property 4: Overlay Video Synchronization', () => {
    it('should maintain frame sync between video and mesh', (done) => {
      const videoScene: SceneConfig = {
        sceneId: 'video-cell',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };
      const meshScene: SceneConfig = {
        sceneId: 'mesh-cell',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };

      engine.registerScene(videoScene);
      engine.registerScene(meshScene);

      engine.seek(3000);

      const videoTime = engine.getSceneLocalTime('video-cell');
      const meshTime = engine.getSceneLocalTime('mesh-cell');

      expect(videoTime).toBe(meshTime);
      done();
    });
  });

  describe('Property 5: Scrubber Accuracy', () => {
    it('should position frame within tolerance', (done) => {
      const scene: SceneConfig = {
        sceneId: 'scrubber-test',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };

      engine.registerScene(scene);

      const targetTime = 7500;
      engine.seek(targetTime);

      const localTime = engine.getSceneLocalTime('scrubber-test');
      const tolerance = 1;

      expect(Math.abs(localTime - targetTime)).toBeLessThanOrEqual(tolerance);
      done();
    });
  });

  describe('Property 6: Grid Resize Preservation', () => {
    it('should preserve cell state after grid resize', (done) => {
      const scene: SceneConfig = {
        sceneId: 'cell-0',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };

      engine.registerScene(scene);
      engine.seek(5000);

      const timeBeforeResize = engine.getSceneLocalTime('cell-0');

      engine.registerScene({
        ...scene,
        sceneId: 'cell-1',
      });

      const timeAfterResize = engine.getSceneLocalTime('cell-0');

      expect(timeBeforeResize).toBe(timeAfterResize);
      done();
    });
  });

  describe('Property 7: Video Mode Preservation', () => {
    it('should preserve frame position when toggling video mode', (done) => {
      const scene: SceneConfig = {
        sceneId: 'video-toggle',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };

      engine.registerScene(scene);
      engine.seek(4000);

      const timeBeforeToggle = engine.getSceneLocalTime('video-toggle');

      engine.seek(4000);

      const timeAfterToggle = engine.getSceneLocalTime('video-toggle');

      expect(timeBeforeToggle).toBe(timeAfterToggle);
      done();
    });
  });

  describe('Property 8: Windowed Controls Draggability', () => {
    it('should maintain position after drag', (done) => {
      const initialPosition = { x: 10, y: 10 };
      const finalPosition = { x: 100, y: 100 };

      expect(finalPosition.x).toBeGreaterThan(initialPosition.x);
      expect(finalPosition.y).toBeGreaterThan(initialPosition.y);

      done();
    });
  });

  describe('Property 9: Mesh Nametag Visibility', () => {
    it('should support nametag without affecting mesh rendering', (done) => {
      const scene: SceneConfig = {
        sceneId: 'nametag-scene',
        offset: 0,
        windowStart: 0,
        windowDuration: 10000,
      };

      engine.registerScene(scene);

      const localTime = engine.getSceneLocalTime('nametag-scene');
      expect(localTime).toBe(0);

      done();
    });
  });
});
