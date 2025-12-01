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
  
  if (trickName && trickName !== 'uncategorized' && trickName !== 'other') {
    return TRICK_NAMES.some(trick => trickName.includes(trick));
  }
  
  if (trickId && trickId !== 'uncategorized' && trickId !== 'other') {
    return TRICK_NAMES.some(trick => trickId.includes(trick));
  }
  
  return false;
}

function extractKeyPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  const phrases: string[] = [];
  
  // Extract key action phrases
  const patterns = [
    /(?:how to|learn to|master|improve|fix|avoid|stop|start|practice)\s+([a-z\s]{3,30}?)(?:\.|,|;|$)/gi,
    /(?:the key to|secret to|technique for|tip for)\s+([a-z\s]{3,30}?)(?:\.|,|;|$)/gi,
    /(?:when|while|if|as you)\s+([a-z\s]{3,30}?)(?:\.|,|;|then|$)/gi,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const phrase = match[1].trim();
      if (phrase.length > 5 && phrase.length < 40) {
        phrases.push(phrase);
      }
    }
  });
  
  return phrases;
}

function clusterByTheme(records: PineconeRecord[]): Map<string, PineconeRecord[]> {
  const themes = new Map<string, PineconeRecord[]>();
  
  records.forEach(record => {
    const text = record.metadata.text || record.metadata.fullText || '';
    const videoTitle = record.metadata.videoTitle || '';
    const combined = (text + ' ' + videoTitle).toLowerCase();
    
    // Identify themes based on content
    let theme = 'general-tips';
    
    if (combined.match(/land(ing)?|impact|absorb|knees bent|sweet spot/)) {
      theme = 'landing-technique';
    } else if (combined.match(/rail|box|jib|slide|grind|50.?50|boardslide|lipslide/)) {
      theme = 'rails-boxes';
    } else if (combined.match(/carv(e|ing)|edge|turn|heel|toe|grip/)) {
      theme = 'carving-edges';
    } else if (combined.match(/jump|air|straight air|pop|ollie|takeoff/)) {
      theme = 'jumping-air';
    } else if (combined.match(/rotat(e|ion)|spin|wind.?up|counter.?rotation|upper body/)) {
      theme = 'rotation-spin';
    } else if (combined.match(/balance|stance|center|weight|stack|posture/)) {
      theme = 'balance-stance';
    } else if (combined.match(/board|binding|boot|gear|equipment|setup|stance width/)) {
      theme = 'equipment-setup';
    } else if (combined.match(/fear|scared|confidence|mental|commit|hesitat|progress|learn/)) {
      theme = 'mental-progression';
    } else if (combined.match(/mistake|wrong|avoid|don't|problem|issue|fix|crash|fall/)) {
      theme = 'common-problems';
    } else if (combined.match(/speed|control|slow|fast|momentum/)) {
      theme = 'speed-control';
    } else if (combined.match(/butter|press|nose|tail|ground trick/)) {
      theme = 'butters-presses';
    } else if (combined.match(/side hit|natural feature|pow|powder|backcountry/)) {
      theme = 'terrain-features';
    } else if (combined.match(/grab|style|tweak|method|indie|mute/)) {
      theme = 'grabs-style';
    } else if (combined.match(/summer|off.?season|train|practice|drill|exercise|tramp/)) {
      theme = 'off-season-training';
    }
    
    if (!themes.has(theme)) {
      themes.set(theme, []);
    }
    themes.get(theme)!.push(record);
  });
  
  return themes;
}

async function main() {
  console.log('🔍 Discovering natural themes from untagged content...\n');
  
  const dataPath = path.join(__dirname, '../data/pinecone-dump.json');
  console.log('Loading data...');
  const records: PineconeRecord[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Filter to non-trick-specific content
  const untagged = records.filter(r => !isTrickSpecific(r) && !r.metadata.summaryOnly);
  
  console.log(`Analyzing ${untagged.length} non-trick-specific tips...\n`);
  
  // Cluster by theme
  const themes = clusterByTheme(untagged);
  
  // Sort by count
  const sortedThemes = Array.from(themes.entries())
    .sort((a, b) => b[1].length - a[1].length);
  
  console.log('=== DISCOVERED THEMES ===\n');
  
  sortedThemes.forEach(([theme, records]) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 THEME: ${theme.toUpperCase().replace(/-/g, ' ')}`);
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
    discoveredThemes: sortedThemes.map(([theme, records]) => ({
      theme,
      count: records.length,
      samples: records.slice(0, 5).map(r => ({
        id: r.id,
        text: (r.metadata.text || r.metadata.fullText || '').substring(0, 200),
        videoTitle: r.metadata.videoTitle,
      })),
      allRecords: records.map(r => ({
        id: r.id,
        text: r.metadata.text || r.metadata.fullText || '',
        videoTitle: r.metadata.videoTitle,
      }))
    }))
  };
  
  const outputPath = path.join(__dirname, '../data/discovered-themes.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Analysis complete! Saved to: ${outputPath}\n`);
  console.log('Summary:');
  sortedThemes.forEach(([theme, records]) => {
    console.log(`  ${theme}: ${records.length} tips`);
  });
}

main().catch(console.error);
