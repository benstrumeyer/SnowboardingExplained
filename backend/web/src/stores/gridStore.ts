import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface CellPlaybackState {
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number;
  totalFrames: number;
  videoMode?: 'original' | 'overlay';
}

export interface CellState {
  id: string;
  contentType: 'empty' | 'video' | 'mesh';
  videoId?: string;
  modelId?: string;
  playbackState: CellPlaybackState;
  isSynced: boolean;
  windowedControlsPosition: { x: number; y: number };
  isWindowedControlsCollapsed: boolean;
  nametag?: string;
}

export interface SharedControlState {
  currentFrame: number;
  playbackSpeed: number;
  cameraPreset: 'top' | 'front' | 'back' | 'left' | 'right';
  isPlaying: boolean;
}

interface GridStore {
  gridRows: number;
  gridColumns: number;
  cells: CellState[];
  sharedControls: SharedControlState;

  setGridDimensions: (rows: number, columns: number) => void;
  updateCell: (cellId: string, updates: Partial<CellState>) => void;
  updateCellPlayback: (cellId: string, updates: Partial<CellPlaybackState>) => void;
  updateSharedControls: (updates: Partial<SharedControlState>) => void;
  setCellFrame: (cellId: string, frame: number) => void;
  setCellPlaying: (cellId: string, playing: boolean) => void;
  setCellSpeed: (cellId: string, speed: number) => void;
  setCellSynced: (cellId: string, synced: boolean) => void;
  setCellNametag: (cellId: string, nametag: string) => void;
  setCellWindowPosition: (cellId: string, x: number, y: number) => void;
  setCellWindowCollapsed: (cellId: string, collapsed: boolean) => void;
  setSharedFrame: (frame: number) => void;
  setSharedPlaying: (playing: boolean) => void;
  setSharedSpeed: (speed: number) => void;
  setSharedCameraPreset: (preset: SharedControlState['cameraPreset']) => void;
}

const createInitialCells = (count: number): CellState[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `cell-${i}`,
    contentType: 'empty' as const,
    playbackState: {
      currentFrame: 0,
      isPlaying: false,
      playbackSpeed: 1,
      totalFrames: 0,
      videoMode: 'original' as const,
    },
    isSynced: false,
    windowedControlsPosition: { x: 10, y: 10 },
    isWindowedControlsCollapsed: false,
    nametag: '',
  }));

export const useGridStore = create<GridStore>()(
  subscribeWithSelector((set, get) => ({
    gridRows: 1,
    gridColumns: 2,
    cells: createInitialCells(16),
    sharedControls: {
      currentFrame: 0,
      playbackSpeed: 1,
      cameraPreset: 'back',
      isPlaying: false,
    },

    setGridDimensions: (rows, columns) => {
      const totalCells = rows * columns;
      const currentCells = get().cells;
      const newCells =
        totalCells > currentCells.length
          ? [...currentCells, ...createInitialCells(totalCells - currentCells.length)]
          : currentCells.slice(0, totalCells);

      set({ gridRows: rows, gridColumns: columns, cells: newCells });
    },

    updateCell: (cellId, updates) => {
      set((state) => ({
        cells: state.cells.map((cell) =>
          cell.id === cellId ? { ...cell, ...updates } : cell
        ),
      }));
    },

    updateCellPlayback: (cellId, updates) => {
      set((state) => ({
        cells: state.cells.map((cell) =>
          cell.id === cellId
            ? {
              ...cell,
              playbackState: { ...cell.playbackState, ...updates },
            }
            : cell
        ),
      }));
    },

    updateSharedControls: (updates) => {
      set((state) => ({
        sharedControls: { ...state.sharedControls, ...updates },
      }));
    },

    setCellFrame: (cellId, frame) => {
      const state = get();
      const cell = state.cells.find((c) => c.id === cellId);
      if (!cell) return;

      get().updateCellPlayback(cellId, { currentFrame: frame });

      if (cell.isSynced) {
        get().setSharedFrame(frame);
      }
    },

    setCellPlaying: (cellId, playing) => {
      const state = get();
      const cell = state.cells.find((c) => c.id === cellId);
      if (!cell) return;

      get().updateCellPlayback(cellId, { isPlaying: playing });

      if (cell.isSynced) {
        get().setSharedPlaying(playing);
      }
    },

    setCellSpeed: (cellId, speed) => {
      const state = get();
      const cell = state.cells.find((c) => c.id === cellId);
      if (!cell) return;

      get().updateCellPlayback(cellId, { playbackSpeed: speed });

      if (cell.isSynced) {
        get().setSharedSpeed(speed);
      }
    },

    setCellSynced: (cellId, synced) => {
      const state = get();
      const cell = state.cells.find((c) => c.id === cellId);
      if (!cell) return;

      get().updateCell(cellId, { isSynced: synced });

      if (synced) {
        get().updateCellPlayback(cellId, {
          currentFrame: state.sharedControls.currentFrame,
          isPlaying: state.sharedControls.isPlaying,
          playbackSpeed: state.sharedControls.playbackSpeed,
        });
      }
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

    setSharedFrame: (frame) => {
      get().updateSharedControls({ currentFrame: frame });
    },

    setSharedPlaying: (playing) => {
      get().updateSharedControls({ isPlaying: playing });
    },

    setSharedSpeed: (speed) => {
      get().updateSharedControls({ playbackSpeed: speed });
    },

    setSharedCameraPreset: (preset) => {
      get().updateSharedControls({ cameraPreset: preset });
    },
  }))
);
