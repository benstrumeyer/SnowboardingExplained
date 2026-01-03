import React from 'react';

interface GridConfigControlsProps {
  rows: number;
  columns: number;
  onGridChange: (rows: number, columns: number) => void;
}

export function GridConfigControls({
  rows,
  columns,
  onGridChange,
}: GridConfigControlsProps) {
  const handleRowsChange = (newRows: number) => {
    onGridChange(Math.max(1, Math.min(4, newRows)), columns);
  };

  const handleColumnsChange = (newColumns: number) => {
    onGridChange(rows, Math.max(1, Math.min(4, newColumns)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <label style={{ color: '#999', fontSize: '12px', minWidth: '40px' }}>Rows:</label>
        <input
          type="number"
          min="1"
          max="4"
          value={rows}
          onChange={(e) => handleRowsChange(parseInt(e.target.value) || 1)}
          style={{
            width: '50px',
            padding: '6px 8px',
            backgroundColor: '#333',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <label style={{ color: '#999', fontSize: '12px', minWidth: '40px' }}>Cols:</label>
        <input
          type="number"
          min="1"
          max="4"
          value={columns}
          onChange={(e) => handleColumnsChange(parseInt(e.target.value) || 1)}
          style={{
            width: '50px',
            padding: '6px 8px',
            backgroundColor: '#333',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        />
      </div>

      <div
        style={{
          color: '#666',
          fontSize: '11px',
          marginTop: '4px',
        }}
      >
        Grid: {rows}×{columns} ({rows * columns} cells)
      </div>
    </div>
  );
}
