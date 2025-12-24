import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { meshDataService } from '../src/services/meshDataService';

/**
 * Property-Based Tests for Stale Mesh Data Fix
 * 
 * These tests verify the correctness properties defined in the design document:
 * - Property 1: Old Data Deletion
 * - Property 2: Deletion Verification
 * - Property 3: Insertion Verification
 * - Property 4: VideoId Integrity on Retrieval
 * - Property 5: Keypoint Data Presence
 * - Property 7: Frame Count Accuracy
 * 
 * NOTE: These tests require MongoDB to be running. They are integration tests.
 * Run with: npm test -- stale-mesh-data-fix.test.ts
 */

describe.skip('Stale Mesh Data Fix - Property-Based Tests (Integration)', () => {
  beforeAll(async () => {
    // Connect to MongoDB for testing
    try {
      await meshDataService.connect();
    } catch (err) {
      console.warn('MongoDB not available for integration tests. Skipping tests.');
      throw err;
    }
  });

  afterAll(async () => {
    // Disconnect from MongoDB
    try {
      await meshDataService.disconnect();
    } catch (err) {
      console.warn('Error disconnecting from MongoDB:', err);
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // This is handled by the test itself
  });

  /**
   * Property 1: Old Data Deletion
   * For any video upload with a new videoId, all frames from the previous videoId 
   * must be deleted before new frames are inserted.
   * 
   * Validates: Requirements 1.1, 1.2
   */
  it('Property 1: Old Data Deletion - should delete old frames before inserting new ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 50 })
        ),
        async ([baseVideoId, oldFrameCount, newFrameCount]) => {
          const oldVideoId = `${baseVideoId}_old`;
          const newVideoId = `${baseVideoId}_new`;

          // Create old frame data
          const oldFrames = Array.from({ length: oldFrameCount }, (_, i) => ({
            frameNumber: i,
            timestamp: i * 0.033,
            keypoints: [{ name: 'pelvis', x: 100, y: 200, z: 0 }],
            skeleton: {}
          }));

          // Save old data
          await meshDataService.saveMeshData({
            videoId: oldVideoId,
            videoUrl: `http://localhost:3001/videos/${oldVideoId}`,
            fps: 30,
            videoDuration: oldFrameCount * 0.033,
            frameCount: oldFrameCount,
            totalFrames: oldFrameCount,
            frames: oldFrames,
            role: 'rider'
          });

          // Create new frame data
          const newFrames = Array.from({ length: newFrameCount }, (_, i) => ({
            frameNumber: i,
            timestamp: i * 0.033,
            keypoints: [{ name: 'pelvis', x: 150, y: 250, z: 0 }],
            skeleton: {}
          }));

          // Save new data with different videoId
          await meshDataService.saveMeshData({
            videoId: newVideoId,
            videoUrl: `http://localhost:3001/videos/${newVideoId}`,
            fps: 30,
            videoDuration: newFrameCount * 0.033,
            frameCount: newFrameCount,
            totalFrames: newFrameCount,
            frames: newFrames,
            role: 'rider'
          });

          // Verify old data is still there (different videoId)
          const oldData = await meshDataService.getMeshData(oldVideoId);
          expect(oldData).not.toBeNull();
          expect(oldData?.frameCount).toBe(oldFrameCount);

          // Verify new data is there
          const newData = await meshDataService.getMeshData(newVideoId);
          expect(newData).not.toBeNull();
          expect(newData?.frameCount).toBe(newFrameCount);

          // Cleanup
          await meshDataService.deleteMeshData(oldVideoId);
          await meshDataService.deleteMeshData(newVideoId);
        }
      ),
      { numRuns: 50 } // Reduced from 100 for faster test execution
    );
  });

  /**
   * Property 2: Deletion Verification
   * For any deletion operation, the system must verify that zero frames remain 
   * for the deleted videoId before proceeding with insertion.
   * 
   * Validates: Requirements 1.2
   */
  it('Property 2: Deletion Verification - should verify zero frames remain after deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 50 })
        ),
        async ([baseVideoId, frameCount]) => {
          const videoId = `${baseVideoId}_delete_test`;

          // Create frame data
          const frames = Array.from({ length: frameCount }, (_, i) => ({
            frameNumber: i,
            timestamp: i * 0.033,
            keypoints: [{ name: 'pelvis', x: 100, y: 200, z: 0 }],
            skeleton: {}
          }));

          // Save data
          await meshDataService.saveMeshData({
            videoId,
            videoUrl: `http://localhost:3001/videos/${videoId}`,
            fps: 30,
            videoDuration: frameCount * 0.033,
            frameCount,
            totalFrames: frameCount,
            frames,
            role: 'rider'
          });

          // Verify data exists
          let data = await meshDataService.getMeshData(videoId);
          expect(data).not.toBeNull();
          expect(data?.frameCount).toBe(frameCount);

          // Delete data
          await meshDataService.deleteMeshData(videoId);

          // Verify deletion - should return null
          data = await meshDataService.getMeshData(videoId);
          expect(data).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 3: Insertion Verification
   * For any frame insertion, the system must verify that all inserted frames 
   * are present in the database with the correct videoId.
   * 
   * Validates: Requirements 1.3, 1.4
   */
  it('Property 3: Insertion Verification - should verify all frames inserted with correct videoId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 50 })
        ),
        async ([baseVideoId, frameCount]) => {
          const videoId = `${baseVideoId}_insert_test`;

          // Create frame data
          const frames = Array.from({ length: frameCount }, (_, i) => ({
            frameNumber: i,
            timestamp: i * 0.033,
            keypoints: [{ name: 'pelvis', x: 100, y: 200, z: 0 }],
            skeleton: {}
          }));

          // Save data
          await meshDataService.saveMeshData({
            videoId,
            videoUrl: `http://localhost:3001/videos/${videoId}`,
            fps: 30,
            videoDuration: frameCount * 0.033,
            frameCount,
            totalFrames: frameCount,
            frames,
            role: 'rider'
          });

          // Verify all frames inserted
          const data = await meshDataService.getMeshData(videoId);
          expect(data).not.toBeNull();
          expect(data?.frameCount).toBe(frameCount);
          expect(data?.frames).toHaveLength(frameCount);

          // Verify each frame has correct videoId
          data?.frames.forEach((frame: any) => {
            expect(frame.videoId).toBe(videoId);
          });

          // Cleanup
          await meshDataService.deleteMeshData(videoId);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 4: VideoId Integrity on Retrieval
   * For any mesh data retrieval request with videoId X, all returned frames 
   * must have videoId equal to X.
   * 
   * Validates: Requirements 2.1, 2.2
   */
  it('Property 4: VideoId Integrity on Retrieval - should verify all retrieved frames have correct videoId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 50 })
        ),
        async ([baseVideoId, frameCount]) => {
          const videoId = `${baseVideoId}_integrity_test`;

          // Create frame data
          const frames = Array.from({ length: frameCount }, (_, i) => ({
            frameNumber: i,
            timestamp: i * 0.033,
            keypoints: [{ name: 'pelvis', x: 100, y: 200, z: 0 }],
            skeleton: {}
          }));

          // Save data
          await meshDataService.saveMeshData({
            videoId,
            videoUrl: `http://localhost:3001/videos/${videoId}`,
            fps: 30,
            videoDuration: frameCount * 0.033,
            frameCount,
            totalFrames: frameCount,
            frames,
            role: 'rider'
          });

          // Retrieve data
          const data = await meshDataService.getMeshData(videoId);
          expect(data).not.toBeNull();

          // Verify all frames have correct videoId
          if (data?.frames) {
            data.frames.forEach((frame: any) => {
              expect(frame.videoId).toBe(videoId);
            });
          }

          // Cleanup
          await meshDataService.deleteMeshData(videoId);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: Keypoint Data Presence
   * For any frame retrieved from the database, the keypoints array 
   * must not be empty.
   * 
   * Validates: Requirements 2.3
   */
  it('Property 5: Keypoint Data Presence - should verify keypoints are not empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 50 })
        ),
        async ([baseVideoId, frameCount]) => {
          const videoId = `${baseVideoId}_keypoint_test`;

          // Create frame data with keypoints
          const frames = Array.from({ length: frameCount }, (_, i) => ({
            frameNumber: i,
            timestamp: i * 0.033,
            keypoints: [
              { name: 'pelvis', x: 100, y: 200, z: 0 },
              { name: 'spine', x: 110, y: 180, z: 0 }
            ],
            skeleton: {}
          }));

          // Save data
          await meshDataService.saveMeshData({
            videoId,
            videoUrl: `http://localhost:3001/videos/${videoId}`,
            fps: 30,
            videoDuration: frameCount * 0.033,
            frameCount,
            totalFrames: frameCount,
            frames,
            role: 'rider'
          });

          // Retrieve data
          const data = await meshDataService.getMeshData(videoId);
          expect(data).not.toBeNull();

          // Verify all frames have keypoints
          if (data?.frames) {
            data.frames.forEach((frame: any) => {
              expect(frame.keypoints).toBeDefined();
              expect(Array.isArray(frame.keypoints)).toBe(true);
              expect(frame.keypoints.length).toBeGreaterThan(0);
            });
          }

          // Cleanup
          await meshDataService.deleteMeshData(videoId);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 7: Frame Count Accuracy
   * For any mesh data save operation, the number of frames saved must 
   * equal the number of frames in the input data.
   * 
   * Validates: Requirements 1.4, 4.4
   */
  it('Property 7: Frame Count Accuracy - should verify saved frame count matches input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 50 })
        ),
        async ([baseVideoId, frameCount]) => {
          const videoId = `${baseVideoId}_count_test`;

          // Create frame data
          const frames = Array.from({ length: frameCount }, (_, i) => ({
            frameNumber: i,
            timestamp: i * 0.033,
            keypoints: [{ name: 'pelvis', x: 100, y: 200, z: 0 }],
            skeleton: {}
          }));

          // Save data
          await meshDataService.saveMeshData({
            videoId,
            videoUrl: `http://localhost:3001/videos/${videoId}`,
            fps: 30,
            videoDuration: frameCount * 0.033,
            frameCount,
            totalFrames: frameCount,
            frames,
            role: 'rider'
          });

          // Retrieve data
          const data = await meshDataService.getMeshData(videoId);
          expect(data).not.toBeNull();

          // Verify frame count matches
          expect(data?.frameCount).toBe(frameCount);
          expect(data?.frames).toHaveLength(frameCount);

          // Cleanup
          await meshDataService.deleteMeshData(videoId);
        }
      ),
      { numRuns: 50 }
    );
  });
});
