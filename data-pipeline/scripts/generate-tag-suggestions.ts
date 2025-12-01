import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PineconeRecord {
  id: string;
  score: number;
  metadata: {
    trickId?: string;
    trickName?: string;
    videoId?: string;
    videoTitle?: string;
    text?: string;
    fullText?: string;
    summaryOnly?: boolean;
  };
}

const TRICK_NAMES = [
  'backside 180', 'frontside 180',
  'backside 360', 'frontside 360',
  'backside 540', 'frontside 540',
  'backside 720', 'frontside 720',
  'backside 900', 'frontside 900',
  'backside 1080', 'frontside 1080',
  'back double cork 1080',
  'pop', 'jump', 'ollie',
  'carving', 'butter', 'shifty',
  '50 50', '50-50',
  'boardslide', 'lipslide',
  'cab 540'
];

function isTrickSpecific(record: PineconeRecord): boolean {
  const trickName = (record.metadata.trickName || '').toLowerCase();
  const trickId = (record.metadata.trickId || '').toLowerCase();
  
  // Check if it has a specific trick name/id
  if (trickName && trickName !== 'uncategorized' && trickName !== 'other') {
    return TRICK_NAMES.some(trick => trickName.includes(trick));
  }
  
  if (trickId && trickId !== 'uncategorized' && trickId !== 'other') {
    return TRICK_NAMES.some(trick => trickId.includes(trick));
  }
  
  return false;
}

function analyzeContent(text: string): string[] {
  const lower = text.toLowerCase();
  const keywords: string[] = [];
  
  // Landing related
  if (lower.match(/land(ing)?|impact|absorb|knees|legs bent/)) {
    keywords.push('landing');
  }
  
  // Rotation/Spin related
  if (lower.match(/rotat(e|ion)|spin|wind.?up|counter.?rotation|upper body|shoulders/)) {
    keywords.push('rotation');
  }
  
  // Edge control
  if (lower.match(/edge|carv(e|ing)|heel|toe|slip(ping)?|catch/)) {
    keywords.push('edge-control');
  }
  
  // Balance/Stance
  if (lower.match(/balance|stance|center|weight|stack(ed)?|posture|position/)) {
    keywords.push('balance');
  }
  
  // Pop/Takeoff
  if (lower.match(/pop|takeoff|ollie|jump|lift|tail|press/)) {
    keywords.push('pop-takeoff');
  }
  
  // Mental/Fear
  if (lower.match(/fear|scared|confidence|mental|commit|hesitat/)) {
    keywords.push('mental');
  }
  
  // Equipment
  if (lower.match(/board|binding|boot|gear|equipment|setup|stance width/)) {
    keywords.push('equipment');
  }
  
  // Rails/Boxes
  if (lower.match(/rail|box|jib|slide|grind|feature/)) {
    keywords.push('rails-boxes');
  }
  
  // Progression/Learning
  if (lower.match(/progress|learn|beginner|practice|train|drill|exercise/)) {
    keywords.push('progression');
  }
  
  // Common mistakes
  if (lower.match(/mistake|wrong|avoid|don't|shouldn't|problem|issue|fix/)) {
    keywords.push('common-mistakes');
  }
  
  // Technique/Form
  if (lower.match(/technique|form|style|movement|motion|body position/)) {
    keywords.push('technique');
  }
  
  // Speed/Control
  if (lower.match(/speed|control|slow|fast|momentum/)) {
    keywords.push('speed-control');
  }
  
  return keywords;
}

async function main() {
  console.log('📊 Analyzing untagged content for tag suggestions...\n');
  
  const dataPath = path.join(__dirname, '../data/pinecone-dump.json');
  console.log('Loading data...');
  const records: PineconeRecord[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${records.length} records`);
  
  // Filter to non-trick-specific content
  console.log('Filtering...');
  const untagged = records.filter(r => !isTrickSpecific(r) && !r.metadata.summaryOnly);
  
  console.log(`Found ${untagged.length} non-trick-specific tips\n`);
  
  // Analyze and group by keywords
  const tagGroups = new Map<string, PineconeRecord[]>();
  
  untagged.forEach(record => {
    const text = record.metadata.text || record.metadata.fullText || '';
    const keywords = analyzeContent(text);
    
    keywords.forEach(keyword => {
      if (!tagGroups.has(keyword)) {
        tagGroups.set(keyword, []);
      }
      tagGroups.get(keyword)!.push(record);
    });
  });
  
  // Sort by count
  const sortedTags = Array.from(tagGroups.entries())
    .sort((a, b) => b[1].length - a[1].length);
  
  console.log('=== SUGGESTED TAGS ===\n');
  
  sortedTags.forEach(([tag, records]) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 TAG: ${tag.toUpperCase()}`);
    console.log(`   Count: ${records.length} tips`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Show 5 sample tips
    const samples = records.slice(0, 5);
    samples.forEach((record, i) => {
      const text = record.metadata.text || record.metadata.fullText || '';
      const preview = text.length > 150 ? text.substring(0, 147) + '...' : text;
      
      console.log(`${i + 1}. ${preview}`);
      console.log(`   Video: ${record.metadata.videoTitle || 'Unknown'}`);
      console.log('');
    });
  });
  
  // Save results
  const output = {
    totalUntagged: untagged.length,
    suggestedTags: sortedTags.map(([tag, records]) => ({
      tag,
      count: records.length,
      samples: records.slice(0, 5).map(r => ({
        id: r.id,
        text: (r.metadata.text || r.metadata.fullText || '').substring(0, 200),
        videoTitle: r.metadata.videoTitle,
      }))
    }))
  };
  
  const outputPath = path.join(__dirname, '../data/tag-suggestions.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Analysis complete! Saved to: ${outputPath}\n`);
  console.log('Summary:');
  sortedTags.forEach(([tag, records]) => {
    console.log(`  ${tag}: ${records.length} tips`);
  });
}

main().catch(console.error);
