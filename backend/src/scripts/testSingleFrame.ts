import * as path from 'path';
import { VideoAnalysisPipeline } from '../services/videoAnalysisPipeline';

/**
 * Testing script: Analyze a single frame with pose visualization
 * 
 * Usage:
 *   npx ts-node src/scripts/testSingleFrame.ts <video_path> [frame_index]
 * 
 * Example:
 *   npx ts-node src/scripts/testSingleFrame.ts ./videos/trick.mp4 150
 *   npx ts-node src/scripts/testSingleFrame.ts ./videos/trick.mp4  (uses middle frame)
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx ts-node src/scripts/testSingleFrame.ts <video_path> [frame_index]');
    console.error('Example: npx ts-node src/scripts/testSingleFrame.ts ./videos/trick.mp4 150');
    process.exit(1);
  }

  const videoPath = args[0];
  const frameIndex = args[1] ? parseInt(args[1], 10) : undefined;

  const outputDir = path.join(process.cwd(), 'test_output');

  console.log('=== Single Frame Testing Mode ===');
  console.log(`Video: ${videoPath}`);
  if (frameIndex !== undefined) {
    console.log(`Target frame: ${frameIndex}`);
  } else {
    console.log('Target frame: middle frame (auto-detected)');
  }
  console.log(`Output directory: ${outputDir}`);
  console.log('');

  try {
    // Create pipeline in testing mode
    const pipeline = new VideoAnalysisPipeline(videoPath, outputDir, true, frameIndex);

    // Run test analysis
    const result = await pipeline.analyzeTestFrame();

    console.log('\n=== Test Results ===');
    console.log(`Frame Index: ${result.frameIndex}`);
    console.log(`Timestamp: ${result.timestamp.toFixed(2)}s`);
    console.log(`Airborne: ${result.features.isAirborne}`);
    console.log(`Visualization: ${result.visualizationPath}`);
    console.log('\n=== Gemini Analysis ===');
    console.log(result.geminAnalysis);

    console.log('\n✓ Testing complete. Check the visualization file to see pose overlay.');
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

main();
