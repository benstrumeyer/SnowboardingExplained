import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

export interface CellUIState {
  id: string;
  contentType: 'empty' | 'video' | 'mesh';
  videoId?: string;
  modelId?: string;
  isSynced: boolean;
  windowedControlsPosition: { x: number; y: number };
  isWindowedControlsCollapsed: boolean;
  nametag?: string;
  videoMode?: 'original' | 'overlay';
}

export interface SharedControlState {
  cameraPreset: 'top' | 'front' | 'back' | 'left' | 'right';
}

interface GridStore {
  playbackTime: number;
  isPlaying: boolean;
  playbackSpeed: number;

  gridRows: number;
  gridColumns: number;
  cells: CellUIState[];
  sharedControls: SharedControlState;

  setGridDimensions: (rows: number, columns: number) => void;
  updateCell: (cellId: string, updates: Partial<CellUIState>) => void;
  setCellSynced: (cellId: string, synced: boolean) => void;
  setCellNametag: (cellId: string, nametag: string) => void;
  setCellWindowPosition: (cellId: string, x: number, y: number) => void;
  setCellWindowCollapsed: (cellId: string, collapsed: boolean) => void;
  setSharedCameraPreset: (preset: SharedControlState['cameraPreset']) => void;

  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: number) => void;
}

const hashCellId = (index: number, timestamp: number): string => {
  const str = `cell-${index}-${timestamp}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `cell-${Math.abs(hash).toString(16).substring(0, 8)}`;
};

const createInitialCells = (count: number, startIndex: number = 0): CellUIState[] => {
  const timestamp = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: hashCellId(startIndex + i, timestamp),
    contentType: 'empty' as const,
    isSynced: false,
    windowedControlsPosition: { x: 10, y: 10 },
    isWindowedControlsCollapsed: false,
    nametag: '',
    videoMode: 'original' as const,
  }));
};

export const useGridStore = create<GridStore>()(
  subscribeWithSelector((set, get) => {
    const engine = getGlobalPlaybackEngine();

    engine.subscribe((state) => {
      set({
        playbackTime: state.playbackTime,
        isPlaying: state.isPlaying,
        playbackSpeed: state.playbackSpeed,
      });
    });

    return {
      playbackTime: 0,
      isPlaying: false,
      playbackSpeed: 1,

      gridRows: 1,
      gridColumns: 1,
      cells: createInitialCells(1),
      sharedControls: {
        cameraPreset: 'back',
      },

      setGridDimensions: (rows, columns) => {
        const totalCells = rows * columns;
        const currentCells = get().cells;
        const newCells =
          totalCells > currentCells.length
            ? [...currentCells, ...createInitialCells(totalCells - currentCells.length, currentCells.length)]
            : currentCells.slice(0, totalCells);

        set({ gridRows: rows, gridColumns: columns, cells: newCells });
      },

      updateCell: (cellId, updates) => {
        console.log('%c[gridStore] 🔄 Cell updated:', 'color: #4ECDC4; font-weight: bold;', {
          cellId,
          updates,
        });
        set((state) => ({
          cells: state.cells.map((cell) =>
            cell.id === cellId ? { ...cell, ...updates } : cell
          ),
        }));
      },

      setCellSynced: (cellId, synced) => {
        get().updateCell(cellId, { isSynced: synced });
      },

      setCellNametag: (cellId, nametag) => {
        get().updateCell(cellId, { nametag });
      },

      setCellWindowPosition: (cellId, x, y) => {
        get().updateCell(cellId, {
          windowedControlsPosition: { x, y },
        });
      },

      setCellWindowCollapsed: (cellId, collapsed) => {
        get().updateCell(cellId, {
          isWindowedControlsCollapsed: collapsed,
        });
      },

      setSharedCameraPreset: (preset) => {
        set((state) => ({
          sharedControls: { ...state.sharedControls, cameraPreset: preset },
        }));
      },

      play: () => {
        engine.play();
      },

      pause: () => {
        engine.pause();
      },

      seek: (time) => {
        engine.seek(time);
      },

      setSpeed: (speed) => {
        engine.setSpeed(speed);
      },
    };
  })
);
