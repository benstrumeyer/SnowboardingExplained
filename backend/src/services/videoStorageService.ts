import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const VIDEOS_DIR = path.join(process.cwd(), 'data', 'videos');

export class VideoStorageService {
  static async ensureVideoDir(videoId: string): Promise<string> {
    const videoDir = path.join(VIDEOS_DIR, videoId);
    await fs.mkdir(videoDir, { recursive: true });
    return videoDir;
  }

  static getVideoPath(videoId: string, type: 'original' | 'overlay'): string {
    return path.join(VIDEOS_DIR, videoId, `${type}.mp4`);
  }

  static getMetadataPath(videoId: string): string {
    return path.join(VIDEOS_DIR, videoId, 'metadata.json');
  }

  static async saveVideo(videoId: string, type: 'original' | 'overlay', buffer: Buffer): Promise<string> {
    const videoDir = await this.ensureVideoDir(videoId);
    const videoPath = path.join(videoDir, `${type}.mp4`);
    await fs.writeFile(videoPath, buffer);
    return videoPath;
  }

  static async saveMetadata(videoId: string, metadata: any): Promise<void> {
    const videoDir = await this.ensureVideoDir(videoId);
    const metadataPath = path.join(videoDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  static async getMetadata(videoId: string): Promise<any> {
    const metadataPath = this.getMetadataPath(videoId);
    if (!existsSync(metadataPath)) return null;
    const data = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(data);
  }

  static async videoExists(videoId: string, type: 'original' | 'overlay'): Promise<boolean> {
    const videoPath = this.getVideoPath(videoId, type);
    return existsSync(videoPath);
  }

  static async deleteVideo(videoId: string): Promise<void> {
    const videoDir = path.join(VIDEOS_DIR, videoId);
    if (existsSync(videoDir)) {
      await fs.rm(videoDir, { recursive: true, force: true });
    }
  }

  static async getVideoSize(videoId: string, type: 'original' | 'overlay'): Promise<number> {
    const videoPath = this.getVideoPath(videoId, type);
    if (!existsSync(videoPath)) return 0;
    const stats = await fs.stat(videoPath);
    return stats.size;
  }
}
