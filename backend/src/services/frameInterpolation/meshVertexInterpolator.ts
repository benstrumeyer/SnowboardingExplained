/**
 * Mesh Vertex Interpolator
 * 
 * Interpolates mesh vertex positions between source frames using linear interpolation.
 * Preserves face connectivity from source frames.
 */

import logger from '../../logger';

/**
 * Interpolated mesh data with metadata
 */
export interface InterpolatedMeshData {
  vertices: number[][];
  faces: number[][];
  interpolated: true;
  sourceFrames: [number, number];
  interpolationFactor: number;
}

/**
 * Mesh Vertex Interpolator
 * 
 * Performs linear interpolation of mesh vertex positions between two source frames.
 */
export class MeshVertexInterpolator {
  /**
   * Interpolate mesh vertices between two frames
   * 
   * @param beforeVertices - Vertices from the frame before the gap (array of [x, y, z])
   * @param afterVertices - Vertices from the frame after the gap
   * @param beforeFaces - Face connectivity from before frame
   * @param afterFaces - Face connectivity from after frame
   * @param factor - Interpolation factor (0 = before, 1 = after)
   * @param beforeFrameIndex - Index of the before frame
   * @param afterFrameIndex - Index of the after frame
   * @returns Interpolated mesh data
   */
  static interpolateMesh(
    beforeVertices: number[][],
    afterVertices: number[][],
    beforeFaces: number[][],
    afterFaces: number[][],
    factor: number,
    beforeFrameIndex: number,
    afterFrameIndex: number
  ): InterpolatedMeshData {
    // Clamp factor to [0, 1]
    const t = Math.max(0, Math.min(1, factor));

    // Handle empty vertex arrays
    if (beforeVertices.length === 0 && afterVertices.length === 0) {
      return {
        vertices: [],
        faces: beforeFaces.length > 0 ? beforeFaces : afterFaces,
        interpolated: true,
        sourceFrames: [beforeFrameIndex, afterFrameIndex],
        interpolationFactor: t
      };
    }

    // Handle mismatched vertex counts
    let alignedBefore = beforeVertices;
    let alignedAfter = afterVertices;

    if (beforeVertices.length !== afterVertices.length) {
      logger.warn('Vertex count mismatch during mesh interpolation', {
        beforeCount: beforeVertices.length,
        afterCount: afterVertices.length
      });

      [alignedBefore, alignedAfter] = this.alignVertexCounts(beforeVertices, afterVertices);
    }

    // Interpolate each vertex
    const interpolatedVertices: number[][] = [];

    for (let i = 0; i < alignedBefore.length; i++) {
      const beforeVertex = alignedBefore[i];
      const afterVertex = alignedAfter[i];

      // Linear interpolation for each coordinate
      const interpolatedVertex: number[] = [];
      const maxCoords = Math.max(beforeVertex.length, afterVertex.length);

      for (let j = 0; j < maxCoords; j++) {
        const beforeVal = beforeVertex[j] ?? 0;
        const afterVal = afterVertex[j] ?? 0;
        interpolatedVertex.push(beforeVal + (afterVal - beforeVal) * t);
      }

      interpolatedVertices.push(interpolatedVertex);
    }

    // Use face connectivity from the frame with more faces (or before frame if equal)
    const faces = beforeFaces.length >= afterFaces.length ? beforeFaces : afterFaces;

    return {
      vertices: interpolatedVertices,
      faces,
      interpolated: true,
      sourceFrames: [beforeFrameIndex, afterFrameIndex],
      interpolationFactor: t
    };
  }

  /**
   * Align vertex counts between two frames
   * 
   * If one frame has more vertices, pad the other with duplicates
   * 
   * @param beforeVertices - Vertices from before frame
   * @param afterVertices - Vertices from after frame
   * @returns Tuple of aligned vertex arrays
   */
  static alignVertexCounts(
    beforeVertices: number[][],
    afterVertices: number[][]
  ): [number[][], number[][]] {
    if (beforeVertices.length === afterVertices.length) {
      return [beforeVertices, afterVertices];
    }

    const maxLength = Math.max(beforeVertices.length, afterVertices.length);

    // Pad the shorter array
    if (beforeVertices.length < maxLength) {
      const padded = [...beforeVertices];
      const lastVertex = beforeVertices[beforeVertices.length - 1] || [0, 0, 0];
      while (padded.length < maxLength) {
        padded.push([...lastVertex]);
      }
      return [padded, afterVertices];
    } else {
      const padded = [...afterVertices];
      const lastVertex = afterVertices[afterVertices.length - 1] || [0, 0, 0];
      while (padded.length < maxLength) {
        padded.push([...lastVertex]);
      }
      return [beforeVertices, padded];
    }
  }

  /**
   * Duplicate mesh data from a single frame (for edge cases)
   * 
   * Used when there's no frame to interpolate from (start/end of video)
   * 
   * @param vertices - Vertices to duplicate
   * @param faces - Faces to duplicate
   * @param sourceFrameIndex - Index of the source frame
   * @returns Mesh data marked as interpolated
   */
  static duplicateMesh(
    vertices: number[][],
    faces: number[][],
    sourceFrameIndex: number
  ): InterpolatedMeshData {
    return {
      vertices: vertices.map(v => [...v]),
      faces: faces.map(f => [...f]),
      interpolated: true,
      sourceFrames: [sourceFrameIndex, sourceFrameIndex],
      interpolationFactor: 0
    };
  }

  /**
   * Interpolate camera translation between two frames
   * 
   * @param beforeTranslation - Camera translation from before frame [x, y, z]
   * @param afterTranslation - Camera translation from after frame
   * @param factor - Interpolation factor (0 = before, 1 = after)
   * @returns Interpolated camera translation
   */
  static interpolateCameraTranslation(
    beforeTranslation: number[] | null | undefined,
    afterTranslation: number[] | null | undefined,
    factor: number
  ): number[] | null {
    if (!beforeTranslation && !afterTranslation) {
      return null;
    }

    if (!beforeTranslation) {
      return afterTranslation ? [...afterTranslation] : null;
    }

    if (!afterTranslation) {
      return [...beforeTranslation];
    }

    const t = Math.max(0, Math.min(1, factor));
    const result: number[] = [];

    const maxLength = Math.max(beforeTranslation.length, afterTranslation.length);
    for (let i = 0; i < maxLength; i++) {
      const beforeVal = beforeTranslation[i] ?? 0;
      const afterVal = afterTranslation[i] ?? 0;
      result.push(beforeVal + (afterVal - beforeVal) * t);
    }

    return result;
  }
}

export default MeshVertexInterpolator;
