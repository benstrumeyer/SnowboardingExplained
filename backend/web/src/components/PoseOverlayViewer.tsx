import { useEffect, useState } from 'react';
import { PlaybackControls } from './PlaybackControls';
import { MeshControls } from './MeshControls';
import { VisibilityToggle } from './VisibilityToggle';
import { CameraControls } from './CameraControls';
import { AdvancedControls } from './AdvancedControls';
import { FrameNavigationControls } from './FrameNavigationControls';
import { HelpOverlay } from './HelpOverlay';
import { MeshViewer } from './MeshViewer';
import { useSynchronizedPlayback } from '../hooks/useSynchronizedPlayback';
import { fetchRiderMesh, fetchReferenceMesh } from '../services/meshDataService';
import { MeshSequence } from '../types';
import { calculateScaleFactor, isProportionMismatchSignificant } from '../utils/skeletonScaler';

interface PoseOverlayViewerProps {
  riderVideoId: string;
  referenceVideoId: string;
  phase: string;
}

export function PoseOverlayViewer({
  riderVideoId,
  referenceVideoId,
  phase,
}: PoseOverlayViewerProps) {
  const [riderMesh, setRiderMesh] = useState<MeshSequence | null>(null);
  const [referenceMesh, setReferenceMesh] = useState<MeshSequence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [inPlaceMode, setInPlaceMode] = useState(false);
  const [scaleToRider, setScaleToRider] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const playback = useSynchronizedPlayback(riderMesh, referenceMesh);

  // Calculate scale factor
  const scaleFactor =
    riderMesh && referenceMesh
      ? calculateScaleFactor(referenceMesh.bodyProportions, riderMesh.bodyProportions)
      : 1;

  const showProportionWarning =
    riderMesh &&
    referenceMesh &&
    isProportionMismatchSignificant(referenceMesh.bodyProportions, riderMesh.bodyProportions) || false;

  // Load mesh data independently - only load if not already loaded
  useEffect(() => {
    if (!riderVideoId || riderMesh) {
      return; // Skip if no videoId or already loaded
    }
    
    console.log(`[VIEWER] Loading rider mesh for ${riderVideoId}`);
    fetchRiderMesh(riderVideoId, phase)
      .then((mesh) => {
        console.log(`[VIEWER] Loaded rider mesh:`, mesh);
        if (!mesh || !mesh.frames || mesh.frames.length === 0) {
          console.warn(`[VIEWER] WARNING: Rider mesh has no frames!`);
        }
        setRiderMesh(mesh);
      })
      .catch((err) => {
        console.error(`[VIEWER] Error loading rider mesh:`, err);
        // Don't set error for duplicate load attempts
        if (!err.message.includes('Already loading')) {
          setError(err instanceof Error ? err.message : 'Failed to load rider mesh');
        }
      });
  }, [riderVideoId, phase, riderMesh]);

  useEffect(() => {
    if (!referenceVideoId || referenceMesh) {
      return; // Skip if no videoId or already loaded
    }
    
    console.log(`[VIEWER] Loading reference mesh for ${referenceVideoId}`);
    fetchReferenceMesh(referenceVideoId, phase)
      .then((mesh) => {
        console.log(`[VIEWER] Loaded reference mesh:`, mesh);
        if (!mesh || !mesh.frames || mesh.frames.length === 0) {
          console.warn(`[VIEWER] WARNING: Reference mesh has no frames!`);
        }
        setReferenceMesh(mesh);
      })
      .catch((err) => {
        console.error(`[VIEWER] Error loading reference mesh:`, err);
        // Don't set error for duplicate load attempts
        if (!err.message.includes('Already loading')) {
          setError(err instanceof Error ? err.message : 'Failed to load reference mesh');
        }
      });
  }, [referenceVideoId, phase, referenceMesh]);

  // Stop loading when we have at least one mesh
  useEffect(() => {
    // Mesh loading is handled by the render logic checking if meshes are available
  }, [riderMesh, referenceMesh]);

  // Get current frame data
  const currentRiderFrame = riderMesh && playback.currentFrame < riderMesh.frames.length
    ? riderMesh.frames[Math.floor(playback.currentFrame)]
    : null;

  const currentReferenceFrame = referenceMesh && playback.currentFrame < referenceMesh.frames.length
    ? referenceMesh.frames[Math.floor(playback.currentFrame)]
    : null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          playback.isPlaying ? playback.pause() : playback.play();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playback.scrub(Math.max(0, playback.currentFrame - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          playback.scrub(Math.min(playback.currentFrame + 1, (riderMesh?.frames.length || 0) - 1));
          break;
        case 'KeyR':
          if (!e.ctrlKey && !e.metaKey) {
            // Reset camera - handled by OrbitControls
          }
          break;
        case 'KeyM':
          if (!e.ctrlKey && !e.metaKey) {
            setMode((m) => (m === 'side-by-side' ? 'overlay' : 'side-by-side'));
          }
          break;
        case 'KeyH':
          if (!e.ctrlKey && !e.metaKey) {
            setShowHelp((h) => !h);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playback, riderMesh]);

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-dark">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!riderMesh && !referenceMesh) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-light">Loading mesh data...</p>
        </div>
      </div>
    );
  }

  const totalFrames = Math.max(
    riderMesh?.frames.length || 0,
    referenceMesh?.frames.length || 0
  );

  return (
    <div className="w-full h-screen bg-dark flex flex-col">
      <HelpOverlay isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          {currentRiderFrame || currentReferenceFrame ? (
            <MeshViewer
              riderMesh={currentRiderFrame || null}
              referenceMesh={currentReferenceFrame || null}
              showRider={playback.showRider}
              showReference={playback.showReference}
              riderRotation={playback.riderRotation}
              referenceRotation={playback.referenceRotation}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Loading mesh data...
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="w-80 bg-gray-800 rounded-lg p-4 overflow-y-auto space-y-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Controls</h2>
            <button
              onClick={() => setShowHelp(true)}
              className="text-gray-400 hover:text-white text-lg"
              title="Help (H)"
            >
              ?
            </button>
          </div>

          <PlaybackControls
            isPlaying={playback.isPlaying}
            currentFrame={playback.currentFrame}
            totalFrames={totalFrames}
            speed={playback.playbackSpeed}
            onPlayPause={() => (playback.isPlaying ? playback.pause() : playback.play())}
            onScrub={playback.scrub}
            onSpeedChange={playback.setSpeed}
          />

          <FrameNavigationControls
            currentFrame={playback.currentFrame}
            totalFrames={totalFrames}
            onPreviousFrame={() => playback.scrub(Math.max(0, playback.currentFrame - 1))}
            onNextFrame={() => playback.scrub(Math.min(playback.currentFrame + 1, totalFrames - 1))}
          />

          <VisibilityToggle
            riderVisible={playback.showRider}
            referenceVisible={playback.showReference}
            onRiderVisibilityChange={(visible) => playback.setVisibility('rider', visible)}
            onReferenceVisibilityChange={(visible) => playback.setVisibility('reference', visible)}
          />

          <MeshControls
            meshName="rider"
            isVisible={playback.showRider}
            frameOffset={playback.riderFrameOffset}
            rotationX={playback.riderRotation.x}
            rotationY={playback.riderRotation.y}
            rotationZ={playback.riderRotation.z}
            currentFrame={Math.floor(playback.currentFrame + playback.riderFrameOffset)}
            onVisibilityChange={(visible) => playback.setVisibility('rider', visible)}
            onFrameOffsetChange={(offset) => playback.setFrameOffset('rider', offset)}
            onRotationChange={(axis, angle) => playback.setRotation('rider', axis, angle)}
          />

          <MeshControls
            meshName="reference"
            isVisible={playback.showReference}
            frameOffset={playback.referenceFrameOffset}
            rotationX={playback.referenceRotation.x}
            rotationY={playback.referenceRotation.y}
            rotationZ={playback.referenceRotation.z}
            currentFrame={Math.floor(playback.currentFrame + playback.referenceFrameOffset)}
            onVisibilityChange={(visible) => playback.setVisibility('reference', visible)}
            onFrameOffsetChange={(offset) => playback.setFrameOffset('reference', offset)}
            onRotationChange={(axis, angle) => playback.setRotation('reference', axis, angle)}
          />

          <AdvancedControls
            inPlaceMode={inPlaceMode}
            scaleToRider={scaleToRider}
            scaleFactor={scaleFactor}
            showProportionWarning={showProportionWarning}
            onInPlaceModeChange={setInPlaceMode}
            onScaleToRiderChange={setScaleToRider}
          />

          <CameraControls onReset={() => {}} />
        </div>
      </div>
    </div>
  );
}
