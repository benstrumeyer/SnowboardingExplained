import React from 'react';
import { useGridStore } from '../stores/gridStore';
import { GridCell } from './GridCell';

export function GridLayout() {
  const gridRows = useGridStore((state) => state.gridRows);
  const gridColumns = useGridStore((state) => state.gridColumns);
  const cells = useGridStore((state) => state.cells);

  const totalCells = gridRows * gridColumns;
  const gridCells = cells.slice(0, totalCells);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: '8px',
        width: '100%',
        height: '100%',
        padding: '8px',
        backgroundColor: '#0a0a0a',
      }}
    >
      {gridCells.map((cell) => (
        <GridCell key={cell.id} cellId={cell.id} />
      ))}
    </div>
  );
}
