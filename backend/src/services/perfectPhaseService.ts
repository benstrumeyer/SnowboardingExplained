import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../db/connection';
import { PoseData } from '../types';

interface PerfectPhaseFrame {
  frameNumber: number;
  imageRaw: string;
  imageMeshOverlay: string;
  poseData: PoseData;
}

interface DataQuality {
  averageConfidence: number;
  highConfidenceFrames: number;
  mediumConfidenceFrames: number;
  lowConfidenceFrames: number;
  qualityIndicator: 'excellent' | 'good' | 'fair' | 'poor';
}

interface PerfectPhaseData {
  trickName: string;
  phaseName: string;
  stance: string;
  frames: PerfectPhaseFrame[];
  dataQuality: DataQuality;
}

class PerfectPhaseService {
  private collectionPromise: Promise<Collection> | null = null;

  private async getCollection(): Promise<Collection> {
    if (!this.collectionPromise) {
      this.collectionPromise = (async () => {
        const db = getDatabase();
        return db.collection('perfect_phases');
      })();
    }
    return this.collectionPromise;
  }

  async savePerfectPhase(data: PerfectPhaseData): Promise<{ id: string }> {
    try {
      const collection = await this.getCollection();
      const document = {
        ...data,
        dateCreated: new Date(),
        dateModified: new Date(),
      };

      const result = await collection.insertOne(document);

      return {
        id: result.insertedId.toString(),
      };
    } catch (error) {
      console.error('Failed to save perfect phase:', error);
      throw error;
    }
  }

  async getPerfectPhases(filters: any = {}): Promise<any[]> {
    try {
      const collection = await this.getCollection();
      const query: any = {};

      if (filters.trickName) {
        query.trickName = { $regex: filters.trickName, $options: 'i' };
      }
      if (filters.phaseName) {
        query.phaseName = filters.phaseName;
      }
      if (filters.stance) {
        query.stance = filters.stance;
      }

      const phases = await collection
        .find(query)
        .sort({ dateCreated: -1 })
        .toArray();

      return phases.map((phase: any) => ({
        id: phase._id.toString(),
        trickName: phase.trickName,
        phaseName: phase.phaseName,
        stance: phase.stance,
        dateCreated: phase.dateCreated,
        frameCount: phase.frames.length,
        averageConfidence: phase.dataQuality.averageConfidence,
      }));
    } catch (error) {
      console.error('Failed to fetch perfect phases:', error);
      throw error;
    }
  }

  async getPerfectPhaseById(id: string): Promise<any> {
    try {
      const collection = await this.getCollection();
      const phase = await collection.findOne({
        _id: new ObjectId(id),
      });

      if (!phase) {
        return null;
      }

      return {
        id: phase._id.toString(),
        ...phase,
      };
    } catch (error) {
      console.error('Failed to fetch perfect phase:', error);
      throw error;
    }
  }

  async deletePerfectPhase(id: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteOne({
        _id: new ObjectId(id),
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete perfect phase:', error);
      throw error;
    }
  }

  async getFrameAnalysis(frameId: string): Promise<any> {
    try {
      // This would query the frame analysis data
      // Implementation depends on how frame data is stored
      return {
        phaseReasoning: 'Frame is in takeoff phase',
        detectionSignals: [],
        mcpToolOutputs: [],
        skeletonData: {},
        poseData: {},
      };
    } catch (error) {
      console.error('Failed to fetch frame analysis:', error);
      throw error;
    }
  }

  async getPhaseIndicator(frameId: string): Promise<any> {
    try {
      // This would query the phase indicator data
      return {
        phaseName: 'Takeoff',
        phaseColor: '#FFA07A',
        framePosition: 'Frame 5 of 20',
      };
    } catch (error) {
      console.error('Failed to fetch phase indicator:', error);
      throw error;
    }
  }

  async comparePhases(
    userPhaseId: string,
    perfectPhaseId: string
  ): Promise<any> {
    try {
      const collection = await this.getCollection();
      const userPhase = await collection.findOne({
        _id: new ObjectId(userPhaseId),
      });
      const perfectPhase = await collection.findOne({
        _id: new ObjectId(perfectPhaseId),
      });

      if (!userPhase || !perfectPhase) {
        throw new Error('Phase not found');
      }

      // Compute deltas between phases
      const deltas = this.computePhaseDeltas(userPhase, perfectPhase);

      return {
        userPhase: userPhaseId,
        perfectPhase: perfectPhaseId,
        deltas,
        patterns: this.identifyPatterns(deltas),
        verdict: this.generateVerdict(deltas),
      };
    } catch (error) {
      console.error('Failed to compare phases:', error);
      throw error;
    }
  }

  private computePhaseDeltas(userPhase: any, perfectPhase: any): any[] {
    const deltas = [];

    // Compare frame counts
    deltas.push({
      metric: 'frameCount',
      userValue: userPhase.frames.length,
      perfectValue: perfectPhase.frames.length,
      delta: userPhase.frames.length - perfectPhase.frames.length,
    });

    // Compare average confidence
    deltas.push({
      metric: 'averageConfidence',
      userValue: userPhase.dataQuality.averageConfidence,
      perfectValue: perfectPhase.dataQuality.averageConfidence,
      delta:
        userPhase.dataQuality.averageConfidence -
        perfectPhase.dataQuality.averageConfidence,
    });

    return deltas;
  }

  private identifyPatterns(deltas: any[]): string[] {
    const patterns = [];

    // Identify patterns based on deltas
    for (const delta of deltas) {
      if (delta.metric === 'averageConfidence' && delta.delta < -0.1) {
        patterns.push('lower_confidence');
      }
      if (delta.metric === 'frameCount' && delta.delta > 5) {
        patterns.push('longer_phase');
      }
    }

    return patterns;
  }

  private generateVerdict(deltas: any[]): string {
    let verdict = 'Your phase execution is ';

    const confidenceDelta = deltas.find(
      (d) => d.metric === 'averageConfidence'
    );
    if (confidenceDelta && confidenceDelta.delta > 0.05) {
      verdict += 'more confident than the reference. ';
    } else if (confidenceDelta && confidenceDelta.delta < -0.05) {
      verdict += 'less confident than the reference. ';
    } else {
      verdict += 'similar in confidence to the reference. ';
    }

    return verdict;
  }
}

export const perfectPhaseService = new PerfectPhaseService();
