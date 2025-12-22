import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ModelsBrowser.css';

interface Model {
  _id: string;
  videoId: string;
  role: 'rider' | 'coach';
  fps: number;
  frameCount: number;
  videoDuration: number;
  createdAt: string;
}

interface ModelsBrowserProps {
  onModelSelect: (videoId: string, role: 'rider' | 'coach') => void;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const ModelsBrowser: React.FC<ModelsBrowserProps> = ({ onModelSelect }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'rider' | 'coach'>('all');

  useEffect(() => {
    loadModels();
    // Auto-poll for new models every 3 seconds
    const interval = setInterval(loadModels, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/mesh-data/list`, {
        timeout: 10000,
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        // Remove duplicates - keep only the most recent for each videoId
        const uniqueModels = new Map<string, Model>();
        response.data.data.forEach((model: Model) => {
          const existing = uniqueModels.get(model.videoId);
          if (!existing || new Date(model.createdAt) > new Date(existing.createdAt)) {
            uniqueModels.set(model.videoId, model);
          }
        });
        setModels(Array.from(uniqueModels.values()).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
      setError(null);
    } catch (err) {
      console.error('[MODELS] Error loading models:', err);
      setError('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = models.filter(m => 
    filter === 'all' || m.role === filter
  );

  const handleDelete = async (videoId: string) => {
    if (!confirm('Delete this model?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/mesh-data/${videoId}`, {
        timeout: 10000,
      });
      setModels(models.filter(m => m.videoId !== videoId));
    } catch (err) {
      console.error('[MODELS] Error deleting model:', err);
      setError('Failed to delete model');
    }
  };

  return (
    <div className="models-browser">
      <div className="models-header">
        <h3>📦 Models</h3>
      </div>

      <div className="models-filter">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({models.length})
        </button>
        <button
          className={`filter-btn ${filter === 'rider' ? 'active' : ''}`}
          onClick={() => setFilter('rider')}
        >
          🏂 Rider ({models.filter(m => m.role === 'rider').length})
        </button>
        <button
          className={`filter-btn ${filter === 'coach' ? 'active' : ''}`}
          onClick={() => setFilter('coach')}
        >
          👨‍🏫 Coach ({models.filter(m => m.role === 'coach').length})
        </button>
      </div>

      {loading && <div className="models-loading">Loading models...</div>}
      {error && <div className="models-error">{error}</div>}

      <div className="models-list">
        {filteredModels.length === 0 ? (
          <div className="models-empty">
            {loading ? 'Loading...' : 'No models yet. Upload a video to get started!'}
          </div>
        ) : (
          filteredModels.map(model => (
            <div key={model.videoId} className="model-item">
              <div className="model-info">
                <div className="model-title">
                  {model.role === 'rider' ? '🏂' : '👨‍🏫'} {model.videoId}
                </div>
                <div className="model-details">
                  <span className="detail">📊 {model.frameCount} frames</span>
                  <span className="detail">⏱️ {model.fps} fps</span>
                  <span className="detail">⏳ {model.videoDuration.toFixed(1)}s</span>
                </div>
                <div className="model-date">
                  {new Date(model.createdAt).toLocaleDateString()} {new Date(model.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <div className="model-actions">
                <button
                  className="action-btn load-btn"
                  onClick={() => onModelSelect(model.videoId, model.role)}
                  title="Load this model"
                >
                  ✓ Load
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDelete(model.videoId)}
                  title="Delete this model"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
