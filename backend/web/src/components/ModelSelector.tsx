import React, { useEffect, useState } from 'react';
import { useGridStore } from '../stores/gridStore';

interface Model {
  id: string;
  name: string;
  frameCount: number;
  fps: number;
}

interface ModelSelectorProps {
  cellId: string;
  onSelect: (videoId: string, frameCount: number, fps: number) => void;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export function ModelSelector({ cellId, onSelect }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const updateCell = useGridStore((state) => state.updateCell);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_URL}/api/videos`);
        const videos = await response.json();
        setModels(
          videos.map((v: any) => ({
            id: v._id,
            name: v.name || v._id,
            frameCount: v.metadata?.frameCount || 0,
            fps: v.metadata?.fps || 30,
          }))
        );
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const handleSelect = (model: Model) => {
    updateCell(cellId, {
      contentType: 'mesh',
      modelId: model.id,
    });
    onSelect(model.id, model.frameCount, model.fps);
  };

  if (loading) {
    return <div style={{ color: '#999', fontSize: '12px' }}>Loading models...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
      {models.map((model) => (
        <button
          key={model.id}
          onClick={() => handleSelect(model)}
          style={{
            padding: '6px 8px',
            backgroundColor: '#333',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '11px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#444';
            e.currentTarget.style.borderColor = '#4ECDC4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#333';
            e.currentTarget.style.borderColor = '#444';
          }}
        >
          <div style={{ fontWeight: '600' }}>{model.name}</div>
          <div style={{ fontSize: '10px', color: '#999' }}>
            {model.frameCount} frames @ {model.fps.toFixed(2)} fps
          </div>
        </button>
      ))}
    </div>
  );
}
