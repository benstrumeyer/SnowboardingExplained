import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ModelsCardList.css';

interface Model {
  _id?: string;
  videoId: string;
  role?: 'rider' | 'coach';
  fps: number;
  frameCount: number;
  videoDuration?: number;
  createdAt: string;
}

interface ModelsCardListProps {
  onModelSelect: (videoId: string, role: 'rider' | 'coach') => void;
  maxCards?: number;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const ModelsCardList: React.FC<ModelsCardListProps> = ({ onModelSelect, maxCards = 4 }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    const interval = setInterval(loadModels, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/mesh-data/list`, {
        timeout: 5000,
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const uniqueModels = new Map<string, Model>();
        response.data.data.forEach((model: Model) => {
          const existing = uniqueModels.get(model.videoId);
          if (!existing || new Date(model.createdAt) > new Date(existing.createdAt)) {
            uniqueModels.set(model.videoId, model);
          }
        });
        setModels(Array.from(uniqueModels.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, maxCards)
        );
        setError(null);
      }
    } catch (err) {
      console.error('[MODELS] Error loading models:', err);
      setError('Backend unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveModel = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/api/mesh-data/${videoId}`, {
        timeout: 5000,
      });
      setModels(models.filter(m => m.videoId !== videoId));
    } catch (err) {
      console.error('[MODELS] Error removing model:', err);
      alert('Failed to remove model');
    }
  };

  if (loading && models.length === 0) {
    return <div className="models-card-list loading">Loading models...</div>;
  }

  if (error && models.length === 0) {
    return <div className="models-card-list empty">No models (backend unavailable)</div>;
  }

  if (models.length === 0) {
    return <div className="models-card-list empty">No models available</div>;
  }

  return (
    <div className="models-card-list">
      {models.map(model => (
        <div key={model.videoId} className="model-card">
          <div className="model-card-icon">
            {(model.role || 'rider') === 'rider' ? '🏂' : '👨‍🏫'}
          </div>
          <div className="model-card-content">
            <div className="model-card-title">{model.videoId}</div>
            <div className="model-card-meta">
              {model.frameCount} frames • {model.fps} fps
            </div>
          </div>
          <div className="model-card-actions">
            <button
              className="model-card-btn load-btn"
              onClick={() => onModelSelect(model.videoId, model.role || 'rider')}
              title="Load this model"
            >
              Load
            </button>
            <button
              className="model-card-btn remove-btn"
              onClick={(e) => handleRemoveModel(model.videoId, e)}
              title="Remove this model"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
