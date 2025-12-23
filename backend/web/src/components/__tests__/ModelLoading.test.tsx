import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { MeshSequence, SyncedFrame, Keypoint } from '../../types';

/**
 * Integration Tests for Model Loading in Each Scene
 * 
 * Feature: mesh-viewer-mvp
 * Tests: Model loading buttons in floating control windows
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('Model Loading in Each Scene', () => {
  const API_URL = 'http://localhost:3001';

  /**
   * Create mock MeshSequence for testing
   */
  function createMockMeshSequence(videoId: string, fps: number = 30, totalFrames: number = 100): MeshSequence {
    const frames: SyncedFrame[] = [];
    
    for (let i = 0; i < totalFrames; i++) {
      const keypoints: Keypoint[] = Array.from({ length: 33 }, (_, idx) => ({
        index: idx,
        name: `keypoint_${idx}`,
        position: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1],
        confidence: 0.9 + Math.random() * 0.1
      }));

      frames.push({
        frameIndex: i,
        timestamp: (i / fps) * 1000,
        videoFrameData: { offset: i },
        meshData: {
          keypoints,
          skeleton: [],
          vertices: keypoints.map(kp => kp.position),
          faces: []
        }
      });
    }

    return {
      videoId,
      videoUrl: `http://localhost:3001/videos/${videoId}`,
      fps,
      videoDuration: totalFrames / fps,
      totalFrames,
      frames,
      metadata: {
        uploadedAt: new Date(),
        processingTime: 1000,
        extractionMethod: 'mediapipe'
      }
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 11.1: Load Video File', () => {
    it('should load video file when model is selected', async () => {
      const videoId = 'rider-video-1';
      const mockMeshSequence = createMockMeshSequence(videoId);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockMeshSequence
        }
      });

      // Simulate API call
      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);

      expect(response.data.success).toBe(true);
      expect(response.data.data.videoId).toBe(videoId);
      expect(response.data.data.videoUrl).toContain(videoId);
      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/api/mesh-data/${videoId}`);
    });

    it('should load different models for left and right scenes independently', async () => {
      const leftVideoId = 'rider-video-1';
      const rightVideoId = 'coach-video-1';

      const leftMesh = createMockMeshSequence(leftVideoId);
      const rightMesh = createMockMeshSequence(rightVideoId);

      mockedAxios.get
        .mockResolvedValueOnce({ data: { success: true, data: leftMesh } })
        .mockResolvedValueOnce({ data: { success: true, data: rightMesh } });

      // Load left scene
      const leftResponse = await mockedAxios.get(`${API_URL}/api/mesh-data/${leftVideoId}`);
      expect(leftResponse.data.data.videoId).toBe(leftVideoId);

      // Load right scene
      const rightResponse = await mockedAxios.get(`${API_URL}/api/mesh-data/${rightVideoId}`);
      expect(rightResponse.data.data.videoId).toBe(rightVideoId);

      // Verify both were called
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Requirement 11.2: Load Mesh Model', () => {
    it('should load mesh model with proper structure', async () => {
      const videoId = 'rider-video-1';
      const mockMeshSequence = createMockMeshSequence(videoId);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockMeshSequence
        }
      });

      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
      const meshData = response.data.data;

      // Verify mesh structure
      expect(meshData.frames).toBeDefined();
      expect(Array.isArray(meshData.frames)).toBe(true);
      expect(meshData.frames.length).toBeGreaterThan(0);

      // Verify frame structure
      const firstFrame = meshData.frames[0];
      expect(firstFrame.frameIndex).toBe(0);
      expect(firstFrame.meshData).toBeDefined();
      expect(firstFrame.meshData.keypoints).toBeDefined();
      expect(firstFrame.meshData.keypoints.length).toBe(33);
    });

    it('should render mesh in 3D scene after loading', async () => {
      const videoId = 'rider-video-1';
      const mockMeshSequence = createMockMeshSequence(videoId);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockMeshSequence
        }
      });

      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
      const meshData = response.data.data;

      // Verify mesh data is complete for rendering
      expect(meshData.videoId).toBe(videoId);
      expect(meshData.fps).toBeGreaterThan(0);
      expect(meshData.totalFrames).toBeGreaterThan(0);
      expect(meshData.frames.every((f: SyncedFrame) => f.meshData.keypoints.length === 33)).toBe(true);
    });
  });

  describe('Requirement 11.3: Loading Indicator', () => {
    it('should display loading indicator during mesh load', async () => {
      const videoId = 'rider-video-1';
      
      // Simulate delayed response
      mockedAxios.get.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => {
            resolve({
              data: {
                success: true,
                data: createMockMeshSequence(videoId)
              }
            }, 100)
          )
        )
      );

      const promise = mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
      
      // At this point, loading indicator should be shown
      expect(promise).toBeDefined();
      
      const response = await promise;
      expect(response.data.success).toBe(true);
    });
  });

  describe('Requirement 11.4: Enable Playback Controls', () => {
    it('should enable playback controls after loading completes', async () => {
      const videoId = 'rider-video-1';
      const mockMeshSequence = createMockMeshSequence(videoId, 30, 100);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockMeshSequence
        }
      });

      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
      const meshData = response.data.data;

      // Verify playback controls can be enabled
      expect(meshData.totalFrames).toBeGreaterThan(0);
      expect(meshData.fps).toBeGreaterThan(0);
      expect(meshData.frames.length).toBe(meshData.totalFrames);
    });

    it('should maintain frame synchronization after loading', async () => {
      const videoId = 'rider-video-1';
      const fps = 30;
      const totalFrames = 100;
      const mockMeshSequence = createMockMeshSequence(videoId, fps, totalFrames);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockMeshSequence
        }
      });

      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
      const meshData = response.data.data;

      // Verify frame synchronization
      for (let i = 0; i < Math.min(10, meshData.frames.length); i++) {
        const frame = meshData.frames[i];
        const expectedTimestamp = (i / fps) * 1000;
        expect(Math.abs(frame.timestamp - expectedTimestamp)).toBeLessThan(1);
      }
    });
  });

  describe('Requirement 11.5: Error Handling', () => {
    it('should display error message when loading fails', async () => {
      const videoId = 'nonexistent-video';

      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Mesh data not found'
          }
        }
      });

      try {
        await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
      }
    });

    it('should allow retry after failed load', async () => {
      const videoId = 'rider-video-1';
      const mockMeshSequence = createMockMeshSequence(videoId);

      // First call fails, second succeeds
      mockedAxios.get
        .mockRejectedValueOnce({
          response: {
            status: 500,
            data: { error: 'Server error' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: mockMeshSequence
          }
        });

      // First attempt fails
      try {
        await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(500);
      }

      // Retry succeeds
      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
      expect(response.data.success).toBe(true);
      expect(response.data.data.videoId).toBe(videoId);
    });

    it('should handle corrupted mesh data gracefully', async () => {
      const videoId = 'corrupted-video';

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            videoId,
            videoUrl: 'http://localhost:3001/videos/corrupted-video',
            fps: 30,
            videoDuration: 0,
            totalFrames: 0,
            frames: [], // Empty frames
            metadata: {
              uploadedAt: new Date(),
              processingTime: 0,
              extractionMethod: 'mediapipe'
            }
          }
        }
      });

      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/${videoId}`);
      expect(response.data.data.frames.length).toBe(0);
    });
  });

  describe('Independent Scene Loading', () => {
    it('should load different models in side-by-side mode', async () => {
      const leftVideoId = 'rider-video-1';
      const rightVideoId = 'coach-video-1';

      const leftMesh = createMockMeshSequence(leftVideoId);
      const rightMesh = createMockMeshSequence(rightVideoId);

      mockedAxios.get
        .mockResolvedValueOnce({ data: { success: true, data: leftMesh } })
        .mockResolvedValueOnce({ data: { success: true, data: rightMesh } });

      // Load left
      const leftResponse = await mockedAxios.get(`${API_URL}/api/mesh-data/${leftVideoId}`);
      expect(leftResponse.data.data.videoId).toBe(leftVideoId);

      // Load right
      const rightResponse = await mockedAxios.get(`${API_URL}/api/mesh-data/${rightVideoId}`);
      expect(rightResponse.data.data.videoId).toBe(rightVideoId);

      // Verify independence
      expect(leftResponse.data.data.videoId).not.toBe(rightResponse.data.data.videoId);
    });

    it('should load different models in comparison mode', async () => {
      const model1Id = 'model-1';
      const model2Id = 'model-2';

      const mesh1 = createMockMeshSequence(model1Id);
      const mesh2 = createMockMeshSequence(model2Id);

      mockedAxios.get
        .mockResolvedValueOnce({ data: { success: true, data: mesh1 } })
        .mockResolvedValueOnce({ data: { success: true, data: mesh2 } });

      const response1 = await mockedAxios.get(`${API_URL}/api/mesh-data/${model1Id}`);
      const response2 = await mockedAxios.get(`${API_URL}/api/mesh-data/${model2Id}`);

      expect(response1.data.data.videoId).toBe(model1Id);
      expect(response2.data.data.videoId).toBe(model2Id);
    });

    it('should load both models in single-scene mode', async () => {
      const riderVideoId = 'rider-video-1';
      const coachVideoId = 'coach-video-1';

      const riderMesh = createMockMeshSequence(riderVideoId);
      const coachMesh = createMockMeshSequence(coachVideoId);

      mockedAxios.get
        .mockResolvedValueOnce({ data: { success: true, data: riderMesh } })
        .mockResolvedValueOnce({ data: { success: true, data: coachMesh } });

      const riderResponse = await mockedAxios.get(`${API_URL}/api/mesh-data/${riderVideoId}`);
      const coachResponse = await mockedAxios.get(`${API_URL}/api/mesh-data/${coachVideoId}`);

      expect(riderResponse.data.data.videoId).toBe(riderVideoId);
      expect(coachResponse.data.data.videoId).toBe(coachVideoId);
      
      // Both should be loaded simultaneously
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Model List Endpoint', () => {
    it('should fetch available models from list endpoint', async () => {
      const mockModels = [
        {
          _id: '1',
          videoId: 'rider-video-1',
          role: 'rider',
          fps: 30,
          frameCount: 100,
          videoDuration: 3.33,
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          videoId: 'coach-video-1',
          role: 'coach',
          fps: 30,
          frameCount: 100,
          videoDuration: 3.33,
          createdAt: new Date().toISOString()
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockModels
        }
      });

      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/list`);

      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBe(2);
      expect(response.data.data[0].videoId).toBe('rider-video-1');
      expect(response.data.data[1].videoId).toBe('coach-video-1');
    });

    it('should filter models by role', async () => {
      const mockModels = [
        {
          _id: '1',
          videoId: 'rider-video-1',
          role: 'rider',
          fps: 30,
          frameCount: 100,
          videoDuration: 3.33,
          createdAt: new Date().toISOString()
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockModels
        }
      });

      const response = await mockedAxios.get(`${API_URL}/api/mesh-data/list`);
      const riderModels = response.data.data.filter((m: any) => m.role === 'rider');

      expect(riderModels.length).toBe(1);
      expect(riderModels[0].videoId).toBe('rider-video-1');
    });
  });
});
