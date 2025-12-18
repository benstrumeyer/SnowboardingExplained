import * as path from 'path';
import { VideoAnalysisPipeline } from '../services/videoAnalysisPipeline';

/**
 * Example script to analyze a snowboarding video
 * Usage: npx ts-node src/scripts/analyzeVideo.ts <video_path>
 */

async function main() {
  const videoPath = process.argv[2];

  if (!videoPath) {
    console.error('Usage: npx ts-node src/scripts/analyzeVideo.ts <video_path>');
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'analysis_output', path.basename(videoPath, path.extname(videoPath)));

  console.log(`Analyzing video: ${videoPath}`);
  console.log(`Output directory: ${outputDir}`);

  const pipeline = new VideoAnalysisPipeline(videoPath, outputDir);

  try {
    const results = await pipeline.analyze();

    console.log('\n=== ANALYSIS RESULTS ===');
    console.log(`Total frames processed: ${results.totalFrames}`);
    console.log(`Phases detected: ${results.phases.length}`);
    console.log(`Batches analyzed: ${results.batchesAnalyzed}`);

    // Print phase summary
    console.log('\nPhase Summary:');
    for (const phase of results.phases) {
      const duration = (phase.endFrame - phase.startFrame) / 30; // Assuming 30fps
      console.log(`  ${phase.name}: frames ${phase.startFrame}-${phase.endFrame} (${duration.toFixed(2)}s)`);
    }

    // Print analysis results
    console.log('\nDetailed Analysis:');
    for (const result of results.results) {
      console.log(`\n--- Batch ${result.batchIndex} (${result.phase}) ---`);
      console.log(`Frames: ${result.frameCount}`);
      console.log('Analysis:');
      console.log(result.analysis);
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

main();
