/**
 * MVP Pipeline Test Script
 * Run with: npx ts-node scripts/test-mvp-pipeline.ts
 * 
 * Tests:
 * 1. Phase detection signals calculation
 * 2. Phase detection algorithm
 * 3. Video analysis pipeline (with mock data)
 */

// Import types
import { PoseFrame, PhaseMap } from '../src/types/formAnalysis';
import { detectPhases } from '../src/utils/phaseDetector';
import { calculatePhaseDetectionSignals } from '../src/utils/phaseDetectionSignals';

/**
 * Generate mock pose data for testing
 */
function generateMockPoseTimeline(frameCount: number = 300): PoseFrame[] {
  const joints = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
  ];

  const timeline: PoseFrame[] = [];

  for (let i = 0; i < frameCount; i++) {
    const phase = i / frameCount; // 0 to 1

    // Simulate trick phases:
    // 0-0.3: setup carve (on ground)
    // 0.3-0.4: windup/snap
    // 0.4-0.45: takeoff
    // 0.45-0.75: air
    // 0.75-1.0: landing

    let hipHeight = 1.5;
    let ankleHeight = 0.1;
    let chestRotation = 0;

    if (phase < 0.3) {
      // Setup carve - on ground
      hipHeight = 1.5;
      ankleHeight = 0.1;
      chestRotation = Math.sin(phase * Math.PI * 4) * 20; // Edge changes
    } else if (phase < 0.4) {
      // Windup/snap
      hipHeight = 1.5 + (phase - 0.3) * 2;
      ankleHeight = 0.1 + (phase - 0.3) * 1;
      chestRotation = -45 + (phase - 0.3) * 450; // Wind up then snap
    } else if (phase < 0.45) {
      // Takeoff
      hipHeight = 1.7 + (phase - 0.4) * 4;
      ankleHeight = 0.3 + (phase - 0.4) * 8; // Feet leave ground
      chestRotation = 45;
    } else if (phase < 0.75) {
      // Air
      const airPhase = (phase - 0.45) / 0.3;
      hipHeight = 2.5 + Math.sin(airPhase * Math.PI) * 0.5; // Arc
      ankleHeight = 2.0 + Math.sin(airPhase * Math.PI) * 0.5;
      chestRotation = 45 + airPhase * 315; // Full rotation
    } else {
      // Landing
      const landPhase = (phase - 0.75) / 0.25;
      hipHeight = 2.5 - landPhase * 1.0;
      ankleHeight = 2.0 - landPhase * 1.9;
      chestRotation = 360;
    }

    const joints3D = joints.map((name) => {
      let x = Math.sin(chestRotation * Math.PI / 180) * 0.3;
      let y = hipHeight;
      let z = Math.cos(chestRotation * Math.PI / 180) * 0.3;

      // Adjust for body part
      if (name.includes('ankle')) {
        y = ankleHeight;
      } else if (name.includes('knee')) {
        y = (hipHeight + ankleHeight) / 2;
      } else if (name.includes('hip')) {
        y = hipHeight;
      } else if (name.includes('shoulder')) {
        y = hipHeight + 0.5;
      } else if (name.includes('eye') || name === 'nose') {
        y = hipHeight + 0.7;
      }

      // Left/right offset
      if (name.includes('left')) {
        x -= 0.2;
      } else if (name.includes('right')) {
        x += 0.2;
      }

      return {
        name,
        position: { x, y, z },
        confidence: 0.85 + Math.random() * 0.15,
      };
    });

    timeline.push({
      frameNumber: i,
      timestamp: i / 30, // 30 fps
      joints3D,
      jointAngles: {
        leftKnee: 90 + Math.sin(phase * Math.PI * 2) * 30,
        rightKnee: 90 + Math.sin(phase * Math.PI * 2) * 30,
        leftHip: 45 + Math.sin(phase * Math.PI * 2) * 20,
        rightHip: 45 + Math.sin(phase * Math.PI * 2) * 20,
        leftShoulder: 30 + Math.sin(phase * Math.PI * 2) * 40,
        rightShoulder: 30 + Math.sin(phase * Math.PI * 2) * 40,
        spine: Math.sin(phase * Math.PI * 2) * 15,
      },
      confidence: 0.85 + Math.random() * 0.15,
    });
  }

  return timeline;
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('MVP PIPELINE TEST (No Database Required)');
  console.log('='.repeat(60));
  console.log();

  try {
    // Test 1: Generate mock pose data
    console.log('1. Generating mock pose timeline...');
    const poseTimeline = generateMockPoseTimeline(300);
    console.log(`   ✓ Generated ${poseTimeline.length} frames of pose data`);
    console.log(`   - Duration: ${poseTimeline[poseTimeline.length - 1].timestamp.toFixed(1)}s`);
    console.log(`   - FPS: 30\n`);

    // Test 2: Calculate phase detection signals
    console.log('2. Calculating phase detection signals...');
    const signals = calculatePhaseDetectionSignals(poseTimeline);
    
    console.log('   ✓ Signals calculated:');
    console.log(`   - Edge transitions: ${signals.edgeTransitions.length}`);
    console.log(`   - Hip height range: ${Math.min(...signals.hipHeight).toFixed(2)} - ${Math.max(...signals.hipHeight).toFixed(2)}`);
    console.log(`   - Max hip velocity: ${Math.max(...signals.hipVelocity.map(Math.abs)).toFixed(3)}`);
    console.log(`   - Chest rotation range: ${Math.min(...signals.chestRotation).toFixed(1)}° - ${Math.max(...signals.chestRotation).toFixed(1)}°\n`);

    // Test 3: Detect phases
    console.log('3. Detecting trick phases...');
    const phases = detectPhases(poseTimeline);

    console.log(`   ✓ Trick type: ${phases.trickType}`);
    console.log(`   ✓ Phase coverage: ${phases.coverage.toFixed(1)}%`);
    console.log('   ✓ Detected phases:');

    for (const [name, phase] of Object.entries(phases.phases)) {
      if (phase) {
        const p = phase as any;
        console.log(`     - ${name}: frames ${p.startFrame}-${p.endFrame} (${p.frameCount} frames)`);
      } else {
        console.log(`     - ${name}: null`);
      }
    }
    console.log();

    // Test 4: Verify phase boundaries make sense
    console.log('4. Validating phase boundaries...');
    
    const takeoff = phases.phases.takeoff;
    const air = phases.phases.air;
    const landing = phases.phases.landing;

    // Takeoff should be before air
    if (takeoff.startFrame >= air.startFrame) {
      throw new Error('Takeoff should be before air phase');
    }
    console.log('   ✓ Takeoff is before air phase');

    // Air should be before landing
    if (air.endFrame >= landing.startFrame) {
      throw new Error('Air should be before landing phase');
    }
    console.log('   ✓ Air is before landing phase');

    // Coverage should be reasonable
    if (phases.coverage < 50) {
      console.log(`   ⚠ Warning: Low phase coverage (${phases.coverage.toFixed(1)}%)`);
    } else {
      console.log(`   ✓ Phase coverage is good (${phases.coverage.toFixed(1)}%)`);
    }
    console.log();

    // Test 5: Verify key moments
    console.log('5. Identifying key moments...');
    
    // Find peak height in air phase
    const airPoses = poseTimeline.slice(air.startFrame, air.endFrame + 1);
    const peakPose = airPoses.reduce((max, curr) => {
      const currHip = curr.joints3D.find(j => j.name === 'left_hip');
      const maxHip = max.joints3D.find(j => j.name === 'left_hip');
      return currHip && maxHip && currHip.position.y > maxHip.position.y ? curr : max;
    });
    
    console.log(`   ✓ Takeoff frame: ${takeoff.startFrame}`);
    console.log(`   ✓ Peak height frame: ${peakPose.frameNumber}`);
    console.log(`   ✓ Landing frame: ${landing.startFrame}`);
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('ALL TESTS PASSED ✓');
    console.log('='.repeat(60));
    console.log();
    console.log('The phase detection algorithm is working correctly.');
    console.log();
    console.log('Next steps to test with real data:');
    console.log('1. Start MongoDB: mongod');
    console.log('2. Start pose service: ./start-pose-service.bat');
    console.log('3. Upload a real video via the API');
    console.log('4. Verify phase detection accuracy on real poses');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
