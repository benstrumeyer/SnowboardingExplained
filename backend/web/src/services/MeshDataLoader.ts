export interface MeshFrameData {
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

export interface RawMeshFrame {
  frameNumber: number;
  vertices: number[][];
  faces: number[][];
  camera: {
    tx: number;
    ty: number;
    tz: number;
    focal_length: number;
  };
}

export class MeshDataLoader {
  static loadFrames(rawFrames: RawMeshFrame[]): MeshFrameData[] {
    return rawFrames.map((frame) => ({
      frameNumber: frame.frameNumber,
      vertices: new Float32Array(frame.vertices.flat()),
      faces: new Uint32Array(frame.faces.flat()),
      camera: frame.camera,
    }));
  }

  static async loadFromUrl(url: string): Promise<MeshFrameData[]> {
    const response = await fetch(url);
    const data = await response.json();
    return this.loadFrames(data);
  }

  static preloadFrames(frames: MeshFrameData[]): MeshFrameData[] {
    return frames.map((frame) => ({
      ...frame,
      vertices: new Float32Array(frame.vertices),
      faces: new Uint32Array(frame.faces),
    }));
  }
}
