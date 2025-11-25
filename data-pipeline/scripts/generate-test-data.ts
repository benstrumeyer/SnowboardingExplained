/**
 * Generate Test Data
 * 
 * Creates fake snowboarding coaching transcripts for testing
 * This lets us build and test the rest of the system while waiting for real data
 */

import fs from 'fs/promises';
import path from 'path';

const testVideos = [
  {
    videoId: 'test-001',
    title: 'How to Backside 180',
    transcript: [
      { text: "Hey everyone, today we're going to learn the backside 180.", offset: 0, duration: 3000 },
      { text: "This is one of the most fundamental tricks in snowboarding.", offset: 3000, duration: 3000 },
      { text: "First, you want to make sure you're comfortable riding switch.", offset: 6000, duration: 4000 },
      { text: "Approach the jump with a medium speed, not too fast.", offset: 10000, duration: 3500 },
      { text: "As you hit the lip, start winding up your shoulders.", offset: 13500, duration: 3000 },
      { text: "Pop off the jump and rotate your upper body.", offset: 16500, duration: 3000 },
      { text: "Your lower body will follow naturally.", offset: 19500, duration: 2500 },
      { text: "Spot your landing early, this is crucial.", offset: 22000, duration: 3000 },
      { text: "Land with your knees bent to absorb the impact.", offset: 25000, duration: 3000 },
      { text: "And ride away switch! That's the backside 180.", offset: 28000, duration: 3500 },
    ]
  },
  {
    videoId: 'test-002',
    title: 'Carving Fundamentals',
    transcript: [
      { text: "Carving is the foundation of good snowboarding.", offset: 0, duration: 3000 },
      { text: "It's all about edge control and weight distribution.", offset: 3000, duration: 3500 },
      { text: "Start on a gentle slope to practice.", offset: 6500, duration: 2500 },
      { text: "Shift your weight to your toes for a toeside carve.", offset: 9000, duration: 3500 },
      { text: "You should feel the edge biting into the snow.", offset: 12500, duration: 3000 },
      { text: "Keep your body aligned over the board.", offset: 15500, duration: 2500 },
      { text: "For heelside, shift your weight back to your heels.", offset: 18000, duration: 3500 },
      { text: "Practice linking these turns together smoothly.", offset: 21500, duration: 3000 },
      { text: "The key is to be patient and let the board do the work.", offset: 24500, duration: 3500 },
    ]
  },
  {
    videoId: 'test-003',
    title: 'Frontside 360 Tutorial',
    transcript: [
      { text: "The frontside 360 is a progression from the frontside 180.", offset: 0, duration: 4000 },
      { text: "Make sure you're comfortable with 180s first.", offset: 4000, duration: 3000 },
      { text: "You'll need a bit more speed for this trick.", offset: 7000, duration: 3000 },
      { text: "Wind up your shoulders even more than a 180.", offset: 10000, duration: 3500 },
      { text: "Pop hard off the lip and commit to the rotation.", offset: 13500, duration: 3500 },
      { text: "Keep your head turning to spot the landing.", offset: 17000, duration: 3000 },
      { text: "You'll be blind for a moment, that's normal.", offset: 20000, duration: 3000 },
      { text: "As you come around, spot your landing.", offset: 23000, duration: 2500 },
      { text: "Stomp it and ride away! Practice makes perfect.", offset: 25500, duration: 3500 },
    ]
  },
  {
    videoId: 'test-004',
    title: 'Edge Control Basics',
    transcript: [
      { text: "Edge control is everything in snowboarding.", offset: 0, duration: 3000 },
      { text: "Without good edge control, you can't progress.", offset: 3000, duration: 3000 },
      { text: "Start by practicing on flat ground.", offset: 6000, duration: 2500 },
      { text: "Rock back and forth between your edges.", offset: 8500, duration: 3000 },
      { text: "Feel how the board responds to your weight shifts.", offset: 11500, duration: 3500 },
      { text: "Now try it while moving slowly.", offset: 15000, duration: 2500 },
      { text: "Make small adjustments with your ankles and knees.", offset: 17500, duration: 3500 },
      { text: "This muscle memory will help with everything else.", offset: 21000, duration: 3500 },
    ]
  },
  {
    videoId: 'test-005',
    title: 'Common Mistakes When Learning Tricks',
    transcript: [
      { text: "Let's talk about common mistakes beginners make.", offset: 0, duration: 3500 },
      { text: "The biggest one is not committing to the rotation.", offset: 3500, duration: 3500 },
      { text: "If you hesitate mid-air, you'll land off-balance.", offset: 7000, duration: 3500 },
      { text: "Another mistake is looking down at your board.", offset: 10500, duration: 3000 },
      { text: "Always look where you want to go, not at your feet.", offset: 13500, duration: 3500 },
      { text: "Also, don't forget to pop! Many people just ride off the jump.", offset: 17000, duration: 4000 },
      { text: "You need that upward momentum to complete rotations.", offset: 21000, duration: 3500 },
      { text: "And finally, practice on smaller features first.", offset: 24500, duration: 3000 },
    ]
  }
];

async function main() {
  console.log('🎭 Generating test data...\n');
  
  // Create test transcripts
  for (const video of testVideos) {
    const transcriptPath = path.join('data', 'transcripts', `${video.videoId}.json`);
    await fs.writeFile(
      transcriptPath,
      JSON.stringify(video.transcript, null, 2)
    );
    console.log(`✅ Created transcript: ${video.title}`);
  }
  
  // Create metadata
  const metadata = testVideos.map(v => ({
    videoId: v.videoId,
    title: v.title,
    url: `https://youtube.com/watch?v=${v.videoId}`,
    thumbnail: `https://img.youtube.com/vi/${v.videoId}/maxresdefault.jpg`,
    duration: v.transcript[v.transcript.length - 1].offset / 1000,
    transcriptLength: v.transcript.length
  }));
  
  await fs.writeFile(
    path.join('data', 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('\n📊 Summary:');
  console.log(`✅ Created ${testVideos.length} test videos`);
  console.log(`📁 Saved to: data/transcripts/`);
  console.log(`📄 Metadata saved to: data/metadata.json`);
  console.log('\n🎯 Next: Run npm run chunk');
}

main().catch(console.error);
