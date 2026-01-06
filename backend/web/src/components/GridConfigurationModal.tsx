import { useState } from 'react';

interface GridConfigurationModalProps {
  isOpen: boolean;
  rows: number;
  columns: number;
  onConfirm: (rows: number, columns: number) => void;
  onCancel: () => void;
}

export function GridConfigurationModal({
  isOpen,
  rows,
  columns,
  onConfirm,
  onCancel,
}: GridConfigurationModalProps) {
  const [localRows, setLocalRows] = useState(rows);
  const [localColumns, setLocalColumns] = useState(columns);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(localRows, localColumns);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#222',
          border: '1px solid #444',
          borderRadius: '8px',
          padding: '24px',
          minWidth: '300px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>
          Grid Configuration
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ color: '#999', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Rows (1-4)
            </label>
            <input
              type="number"
              min="1"
              max="4"
              value={localRows}
              onChange={(e) => setLocalRows(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#333',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#999', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Columns (1-4)
            </label>
            <input
              type="number"
              min="1"
              max="4"
              value={localColumns}
              onChange={(e) => setLocalColumns(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#333',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
            Total cells: {localRows * localColumns}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#4ECDC4',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              Confirm
            </button>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
