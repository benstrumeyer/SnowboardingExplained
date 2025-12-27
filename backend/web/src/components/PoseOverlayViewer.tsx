import { useEffect, useState } from 'react';
import { TrackingVisualization } from './TrackingVisualization';
import { MeshViewer } from './MeshViewer';
import { FloatingControlPanel } from './FloatingControlPanel';
import { VideoDisplay } from './VideoDisplay';
import { fetchRiderMesh, fetchReferenceMesh } from '../services/meshDataService';
import { MeshSequence } from '../types';
import { CameraService } from '../services/cameraService';

interface ScreenState {
  mesh: MeshSequence | null;
  isVisible: boolean;
  color: string;
  opacity: number;
  cameraService: CameraService | null;
  showTrackingLines: boolean;
  enabledKeypoints: Set<number>;
}

interface PoseOverlayViewerProps {
  riderVideoId: string;
  referenceVideoId: string;
  viewMode: 'side-by-side' | 'overlay' | 'comparison' | 'single-scene';
  onViewModeChange: (mode: 'side-by-side' | 'overlay' | 'comparison' | 'single-scene') => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  totalFrames: number;
  onTotalFramesChange: (frames: number) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  sharedCameraPreset: 'top' | 'front' | 'back' | 'left' | 'right';
  onRiderVideoChange?: (videoId: string) => void;
  onReferenceVideoChange?: (videoId: string) => void;
  leftSceneFrame: number;
  onLeftSceneFrameChange: (frame: number) => void;
  rightSceneFrame: number;
  onRightSceneFrameChange: (frame: number) => void;
  onSyncScenes: () => void;
}

export function PoseOverlayViewer({
  riderVideoId,
  referenceVideoId,
  viewMode,
  onViewModeChange: _onViewModeChange,
  isPlaying,
  onPlayingChange,
  currentFrame: _currentFrame,
  onFrameChange,
  totalFrames,
  onTotalFramesChange,
  playbackSpeed,
  onSpeedChange,
  sharedCameraPreset: _sharedCameraPreset,
  onRiderVideoChange,
  onReferenceVideoChange,
  leftSceneFrame,
  onLeftSceneFrameChange,
  rightSceneFrame,
  onRightSceneFrameChange,
  onSyncScenes: _onSyncScenes,
}: PoseOverlayViewerProps) {
  const [error, setError] = useState<string | null>(null);

  // Left screen state
  const [leftScreen, setLeftScreen] = useState<ScreenState>({
    mesh: null,
    isVisible: true,
    color: '#FF6B6B',
    opacity: 1,
    cameraService: null,
    showTrackingLines: false,
    enabledKeypoints: new Set(),
  });

  // Right screen state
  const [rightScreen, setRightScreen] = useState<ScreenState>({
    mesh: null,
    isVisible: true,
    color: '#4ECDC4',
    opacity: 1,
    cameraService: null,
    showTrackingLines: false,
    enabledKeypoints: new Set(),
  });

  // Load rider mesh into left screen
  // CRITICAL: Reload mesh when riderVideoId changes, even if mesh is already loaded
  // This fixes the stale mesh data issue where old mesh displays when switching videos
  useEffect(() => {
    if (!riderVideoId) return;
    
    console.log(`%c[VIEWER] 🎬 Loading rider mesh for ${riderVideoId}`, 'color: #FF6B6B; font-weight: bold;');
    
    // Clear previous mesh when videoId changes
    if (leftScreen.mesh && leftScreen.mesh.videoId !== riderVideoId) {
      console.log(`%c[VIEWER] 🗑️  Clearing old mesh (videoId: ${leftScreen.mesh.videoId})`, 'color: #FF6B6B;');
      setLeftScreen(prev => ({ ...prev, mesh: null }));
    }
    
    fetchRiderMesh(riderVideoId)
      .then((mesh) => {
        console.log(`%c[VIEWER] ✅ Loaded rider mesh for ${riderVideoId}:`, 'color: #00FF00; font-weight: bold;', mesh);
        setLeftScreen(prev => ({ ...prev, mesh }));
      })
      .catch((err) => {
        console.error(`[VIEWER] Error loading rider mesh:`, err);
        if (!err.message.includes('Already loading')) {
          setError(err instanceof Error ? err.message : 'Failed to load rider mesh');
        }
      });
  }, [riderVideoId]); // Only depend on riderVideoId, not leftScreen.mesh

  // Load reference mesh into right screen
  // CRITICAL: Reload mesh when referenceVideoId changes, even if mesh is already loaded
  // This fixes the stale mesh data issue where old mesh displays when switching videos
  useEffect(() => {
    if (!referenceVideoId) return;
    
    console.log(`%c[VIEWER] 🎬 Loading reference mesh for ${referenceVideoId}`, 'color: #4ECDC4; font-weight: bold;');
    
    // Clear previous mesh when videoId changes
    if (rightScreen.mesh && rightScreen.mesh.videoId !== referenceVideoId) {
      console.log(`%c[VIEWER] 🗑️  Clearing old mesh (videoId: ${rightScreen.mesh.videoId})`, 'color: #4ECDC4;');
      setRightScreen(prev => ({ ...prev, mesh: null }));
    }
    
    fetchReferenceMesh(referenceVideoId)
      .then((mesh) => {
        console.log(`%c[VIEWER] ✅ Loaded reference mesh for ${referenceVideoId}:`, 'color: #00FF00; font-weight: bold;', mesh);
        setRightScreen(prev => ({ ...prev, mesh }));
      })
      .catch((err) => {
        console.error(`[VIEWER] Error loading reference mesh:`, err);
        if (!err.message.includes('Already loading')) {
          setError(err instanceof Error ? err.message : 'Failed to load reference mesh');
        }
      });
  }, [referenceVideoId]); // Only depend on referenceVideoId, not rightScreen.mesh

  // Get current frames using independent scene frames
  const currentLeftFrame = leftScreen.mesh && leftScreen.mesh.frames && leftSceneFrame < leftScreen.mesh.frames.length
    ? leftScreen.mesh.frames[Math.floor(leftSceneFrame)]
    : null;

  const currentRightFrame = rightScreen.mesh && rightScreen.mesh.frames && rightSceneFrame < rightScreen.mesh.frames.length
    ? rightScreen.mesh.frames[Math.floor(rightSceneFrame)]
    : null;

  // Sync playback to video element's timeupdate event
  // This ensures mesh frames stay perfectly synchronized with video playback
  useEffect(() => {
    if (!isPlaying) return;

    const maxLeftFrames = leftScreen.mesh?.frames?.length || 0;
    const maxRightFrames = rightScreen.mesh?.frames?.length || 0;

    if (maxLeftFrames === 0 && maxRightFrames === 0) return;

    // Find video element in the DOM
    const videoElement = document.querySelector('video') as HTMLVideoElement | null;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const videoTimeInSeconds = videoElement.currentTime;
      const fps = 30; // Default FPS
      const newFrameIndex = Math.floor(videoTimeInSeconds * fps);

      // Update left scene frame
      if (maxLeftFrames > 0) {
        const clampedFrame = Math.min(newFrameIndex, maxLeftFrames - 1);
        if (clampedFrame !== leftSceneFrame) {
          onLeftSceneFrameChange(clampedFrame);
        }
      }

      // Update right scene frame
      if (maxRightFrames > 0) {
        const clampedFrame = Math.min(newFrameIndex, maxRightFrames - 1);
        if (clampedFrame !== rightSceneFrame) {
          onRightSceneFrameChange(clampedFrame);
        }
      }
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPlaying, leftSceneFrame, rightSceneFrame, onLeftSceneFrameChange, onRightSceneFrameChange, leftScreen.mesh, rightScreen.mesh]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onPlayingChange(!isPlaying);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onLeftSceneFrameChange(Math.max(0, leftSceneFrame - 1));
          onRightSceneFrameChange(Math.max(0, rightSceneFrame - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          const maxLeftFrame = (leftScreen.mesh?.frames?.length || 0) - 1;
          const maxRightFrame = (rightScreen.mesh?.frames?.length || 0) - 1;
          onLeftSceneFrameChange(Math.min(leftSceneFrame + 1, maxLeftFrame));
          onRightSceneFrameChange(Math.min(rightSceneFrame + 1, maxRightFrame));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, leftSceneFrame, rightSceneFrame, onPlayingChange, onLeftSceneFrameChange, onRightSceneFrameChange, leftScreen.mesh, rightScreen.mesh]);

  // Update total frames when meshes change
  useEffect(() => {
    const newTotalFrames = Math.max(
      leftScreen.mesh?.frames?.length || 0,
      rightScreen.mesh?.frames?.length || 0
    );
    onTotalFramesChange(newTotalFrames);
  }, [leftScreen.mesh, rightScreen.mesh, onTotalFramesChange]);

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!leftScreen.mesh && !rightScreen.mesh) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading mesh data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      {/* Top Control Bar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 space-y-2">
        {/* Global Playback Controls */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Screen Section */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          {/* Left Screen Viewer */}
          <div className="flex-1 bg-gray-950 overflow-hidden relative">
            {viewMode === 'side-by-side' && leftScreen.mesh && leftScreen.isVisible ? (
              <div className="w-full h-full flex">
                {/* Video */}
                <div className="w-1/2 bg-black flex items-center justify-center border-r border-gray-700">
                  <VideoDisplay
                    videoUrl={leftScreen.mesh.videoUrl}
                    currentFrame={leftSceneFrame}
                    totalFrames={totalFrames}
                    isPlaying={isPlaying}
                  />
                </div>
                {/* Mesh */}
                <div className="w-1/2 bg-gray-950 relative">
                  {currentLeftFrame ? (
                    <>
                      <MeshViewer
                        riderMesh={currentLeftFrame}
                        referenceMesh={null}
                        showRider={true}
                        showReference={false}
                        riderRotation={{ x: 0, y: 0, z: 0 }}
                        referenceRotation={{ x: 0, y: 0, z: 0 }}
                        riderColor={leftScreen.color}
                        riderOpacity={leftScreen.opacity}
                        referenceColor={leftScreen.color}
                        referenceOpacity={leftScreen.opacity}
                        showTrackingLines={leftScreen.showTrackingLines}
                        enabledKeypoints={leftScreen.enabledKeypoints}
                        onCameraServiceReady={(service) => setLeftScreen(prev => ({ ...prev, cameraService: service }))}
                      />
                      {/* Floating Control Panel */}
                      <FloatingControlPanel
                        onModelSelect={(videoId, role) => {
                          if (role === 'rider' || role === 'coach') {
                            onRiderVideoChange?.(videoId);
                          }
                        }}
                        currentFrame={leftSceneFrame}
                        totalFrames={totalFrames}
                        isPlaying={isPlaying}
                        onPlayPause={() => onPlayingChange(!isPlaying)}
                        onFrameChange={onFrameChange}
                        onSceneFrameChange={onLeftSceneFrameChange}
                        playbackSpeed={playbackSpeed}
                        onSpeedChange={onSpeedChange}
                        sceneId="left"
                      >
                        <div className="floating-section">
                          <label className="floating-label">Scene Controls</label>
                          
                          {/* Visibility Toggle */}
                          <button
                            onClick={() => setLeftScreen(prev => ({ ...prev, isVisible: !prev.isVisible }))}
                            style={{
                              width: '100%',
                              padding: '6px',
                              background: '#333',
                              color: '#fff',
                              border: '1px solid #555',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            {leftScreen.isVisible ? '👁️ Visible' : '🚫 Hidden'}
                          </button>

                          {/* Color */}
                          <div style={{ marginBottom: '10px', marginTop: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>Color</label>
                            <input
                              type="color"
                              value={leftScreen.color}
                              onChange={(e) => setLeftScreen(prev => ({ ...prev, color: e.target.value }))}
                              style={{ width: '100%', height: '28px', cursor: 'pointer', borderRadius: '4px', border: 'none' }}
                            />
                          </div>

                          {/* Opacity */}
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>
                              Opacity: {(leftScreen.opacity * 100).toFixed(0)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={leftScreen.opacity}
                              onChange={(e) => setLeftScreen(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                              style={{ width: '100%' }}
                            />
                          </div>

                          {/* Camera Presets */}
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>Camera</label>
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                              {(['top', 'front', 'back', 'left', 'right'] as const).map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => leftScreen.cameraService?.setPreset(preset)}
                                  style={{
                                    flex: '1 1 calc(50% - 1.5px)',
                                    padding: '4px',
                                    background: '#333',
                                    color: '#fff',
                                    border: '1px solid #555',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '9px',
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Tracking Lines */}
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                              <input
                                type="checkbox"
                                checked={leftScreen.showTrackingLines}
                                onChange={(e) => setLeftScreen(prev => ({ ...prev, showTrackingLines: e.target.checked }))}
                                style={{ marginRight: '6px' }}
                              />
                              <span style={{ fontSize: '10px' }}>Tracking Lines</span>
                            </label>
                            {leftScreen.showTrackingLines && (
                              <TrackingVisualization
                                onTrackingToggle={(index, enabled) => {
                                  const newSet = new Set(leftScreen.enabledKeypoints);
                                  if (enabled) newSet.add(index);
                                  else newSet.delete(index);
                                  setLeftScreen(prev => ({ ...prev, enabledKeypoints: newSet }));
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </FloatingControlPanel>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">Loading...</div>
                  )}
                </div>
              </div>
            ) : viewMode === 'overlay' && leftScreen.mesh && leftScreen.isVisible ? (
              <div className="w-full h-full bg-black flex items-center justify-center relative">
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <VideoDisplay
                    videoUrl={leftScreen.mesh.videoUrl}
                    currentFrame={leftSceneFrame}
                    totalFrames={totalFrames}
                    isPlaying={isPlaying}
                  />
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    {currentLeftFrame && (
                      <>
                        <MeshViewer
                          riderMesh={currentLeftFrame}
                          referenceMesh={null}
                          showRider={true}
                          showReference={false}
                          riderRotation={{ x: 0, y: 0, z: 0 }}
                          referenceRotation={{ x: 0, y: 0, z: 0 }}
                          riderColor={leftScreen.color}
                          riderOpacity={leftScreen.opacity}
                          referenceColor={leftScreen.color}
                          referenceOpacity={leftScreen.opacity}
                          showTrackingLines={leftScreen.showTrackingLines}
                          enabledKeypoints={leftScreen.enabledKeypoints}
                          onCameraServiceReady={(service) => setLeftScreen(prev => ({ ...prev, cameraService: service }))}
                        />
                        {/* Floating Control Panel */}
                        <FloatingControlPanel
                          onModelSelect={(videoId, role) => {
                            if (role === 'rider' || role === 'coach') {
                              onRiderVideoChange?.(videoId);
                            }
                          }}
                          currentFrame={leftSceneFrame}
                          totalFrames={totalFrames}
                          isPlaying={isPlaying}
                          onPlayPause={() => onPlayingChange(!isPlaying)}
                          onFrameChange={onFrameChange}
                          onSceneFrameChange={onLeftSceneFrameChange}
                          playbackSpeed={playbackSpeed}
                          onSpeedChange={onSpeedChange}
                          sceneId="left"
                        >
                          <div className="floating-section">
                            <label className="floating-label">Scene Controls</label>
                            
                            {/* Opacity */}
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>
                                Opacity: {(leftScreen.opacity * 100).toFixed(0)}%
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={leftScreen.opacity}
                                onChange={(e) => setLeftScreen(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                                style={{ width: '100%' }}
                              />
                            </div>
                          </div>
                        </FloatingControlPanel>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : viewMode === 'comparison' && leftScreen.mesh && leftScreen.isVisible ? (
              <div className="w-full h-full relative">
                {currentLeftFrame ? (
                  <>
                    <MeshViewer
                      riderMesh={currentLeftFrame}
                      referenceMesh={null}
                      showRider={true}
                      showReference={false}
                      riderRotation={{ x: 0, y: 0, z: 0 }}
                      referenceRotation={{ x: 0, y: 0, z: 0 }}
                      riderColor={leftScreen.color}
                      riderOpacity={leftScreen.opacity}
                      referenceColor={leftScreen.color}
                      referenceOpacity={leftScreen.opacity}
                      showTrackingLines={leftScreen.showTrackingLines}
                      enabledKeypoints={leftScreen.enabledKeypoints}
                      onCameraServiceReady={(service) => setLeftScreen(prev => ({ ...prev, cameraService: service }))}
                    />
                    {/* Floating Control Panel */}
                    <FloatingControlPanel
                      onModelSelect={(videoId, role) => {
                        if (role === 'rider' || role === 'coach') {
                          onRiderVideoChange?.(videoId);
                        }
                      }}
                      currentFrame={leftSceneFrame}
                      totalFrames={totalFrames}
                      isPlaying={isPlaying}
                      onPlayPause={() => onPlayingChange(!isPlaying)}
                      onFrameChange={onFrameChange}
                      onSceneFrameChange={onLeftSceneFrameChange}
                      playbackSpeed={playbackSpeed}
                      onSpeedChange={onSpeedChange}
                      sceneId="left"
                    >
                      <div className="floating-section">
                        <label className="floating-label">Scene Controls</label>
                        
                        {/* Color */}
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>Color</label>
                          <input
                            type="color"
                            value={leftScreen.color}
                            onChange={(e) => setLeftScreen(prev => ({ ...prev, color: e.target.value }))}
                            style={{ width: '100%', height: '28px', cursor: 'pointer', borderRadius: '4px', border: 'none' }}
                          />
                        </div>

                        {/* Opacity */}
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>
                            Opacity: {(leftScreen.opacity * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={leftScreen.opacity}
                            onChange={(e) => setLeftScreen(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                        </div>

                        {/* Camera Presets */}
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>Camera</label>
                          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                            {(['top', 'front', 'back', 'left', 'right'] as const).map((preset) => (
                              <button
                                key={preset}
                                onClick={() => leftScreen.cameraService?.setPreset(preset)}
                                style={{
                                  flex: '1 1 calc(50% - 1.5px)',
                                  padding: '4px',
                                  background: '#333',
                                  color: '#fff',
                                  border: '1px solid #555',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '9px',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </FloatingControlPanel>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">Loading...</div>
                )}
              </div>
            ) : viewMode === 'single-scene' && leftScreen.isVisible ? (
              <div className="w-full h-full relative">
                {currentLeftFrame || currentRightFrame ? (
                  <>
                    <MeshViewer
                      riderMesh={currentLeftFrame || null}
                      referenceMesh={currentRightFrame || null}
                      showRider={leftScreen.isVisible}
                      showReference={rightScreen.isVisible}
                      riderRotation={{ x: 0, y: 0, z: 0 }}
                      referenceRotation={{ x: 0, y: 0, z: 0 }}
                      riderColor={leftScreen.color}
                      riderOpacity={leftScreen.opacity}
                      referenceColor={rightScreen.color}
                      referenceOpacity={rightScreen.opacity}
                      showTrackingLines={leftScreen.showTrackingLines}
                      enabledKeypoints={leftScreen.enabledKeypoints}
                      onCameraServiceReady={(service) => setLeftScreen(prev => ({ ...prev, cameraService: service }))}
                    />
                    {/* Floating Control Panel */}
                    <FloatingControlPanel
                      onModelSelect={(videoId, role) => {
                        if (role === 'rider') {
                          onRiderVideoChange?.(videoId);
                        } else {
                          onReferenceVideoChange?.(videoId);
                        }
                      }}
                      currentFrame={leftSceneFrame}
                      totalFrames={totalFrames}
                      isPlaying={isPlaying}
                      onPlayPause={() => onPlayingChange(!isPlaying)}
                      onFrameChange={onFrameChange}
                      onSceneFrameChange={onLeftSceneFrameChange}
                      playbackSpeed={playbackSpeed}
                      onSpeedChange={onSpeedChange}
                      sceneId="left"
                    >
                      <div className="floating-section">
                        <label className="floating-label">Left Mesh</label>
                        
                        {/* Visibility Toggle */}
                        <button
                          onClick={() => setLeftScreen(prev => ({ ...prev, isVisible: !prev.isVisible }))}
                          style={{
                            width: '100%',
                            padding: '6px',
                            background: '#333',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          {leftScreen.isVisible ? '👁️ Visible' : '🚫 Hidden'}
                        </button>

                        {/* Color */}
                        <div style={{ marginBottom: '10px', marginTop: '8px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>Color</label>
                          <input
                            type="color"
                            value={leftScreen.color}
                            onChange={(e) => setLeftScreen(prev => ({ ...prev, color: e.target.value }))}
                            style={{ width: '100%', height: '28px', cursor: 'pointer', borderRadius: '4px', border: 'none' }}
                          />
                        </div>

                        {/* Opacity */}
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>
                            Opacity: {(leftScreen.opacity * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={leftScreen.opacity}
                            onChange={(e) => setLeftScreen(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      <div className="floating-section">
                        <label className="floating-label">Right Mesh</label>
                        
                        {/* Visibility Toggle */}
                        <button
                          onClick={() => setRightScreen(prev => ({ ...prev, isVisible: !prev.isVisible }))}
                          style={{
                            width: '100%',
                            padding: '6px',
                            background: '#333',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          {rightScreen.isVisible ? '👁️ Visible' : '🚫 Hidden'}
                        </button>

                        {/* Color */}
                        <div style={{ marginBottom: '10px', marginTop: '8px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>Color</label>
                          <input
                            type="color"
                            value={rightScreen.color}
                            onChange={(e) => setRightScreen(prev => ({ ...prev, color: e.target.value }))}
                            style={{ width: '100%', height: '28px', cursor: 'pointer', borderRadius: '4px', border: 'none' }}
                          />
                        </div>

                        {/* Opacity */}
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '600' }}>
                            Opacity: {(rightScreen.opacity * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={rightScreen.opacity}
                            onChange={(e) => setRightScreen(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    </FloatingControlPanel>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">Loading...</div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">Screen Hidden</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
