import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

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
  };
}

const TRICK_CATEGORIES = [
  'Backside 180', 'Frontside 180',
  'Backside 360', 'Frontside 360',
  'Backside 540', 'Frontside 540',
  'Backside 720', 'Frontside 720',
  'Backside 900', 'Frontside 900',
  'Backside 1080', 'Frontside 1080',
  'Jump', 'Pop', 'Ollie',
  'Carving', 'Edge Control',
  'Butter', 'Shifty',
  '50-50', 'Boardslide', 'Lipslide',
  'Rails', 'Boxes',
  'Equipment', 'Gear',
  'Technique', 'Balance',
  'Landing', 'Takeoff',
  'General Tips',
  'Other'
];

async function categorizeWithAI(text: string, videoTitle: string, genAI: GoogleGenerativeAI): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `You are categorizing snowboarding tips and advice. Based on the content below, choose the MOST RELEVANT category from this list:

${TRICK_CATEGORIES.join(', ')}

Video Title: ${videoTitle}
Content: ${text.substring(0, 500)}

Return ONLY the category name, nothing else. If it doesn't fit any specific trick, use "General Tips" or "Other".`;

  try {
    const result = await model.generateContent(prompt);
    const category = result.response.text().trim();
    return category;
  } catch (error) {
    console.error('AI Error:', error);
    return 'Other';
  }
}

async function main() {
  console.log('🤖 AI-Powered Categorization Starting...\n');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  const dataPath = path.join(__dirname, '../data/pinecone-dump.json');
  const records: PineconeRecord[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Filter uncategorized and "Other"
  const uncategorized = records.filter(r => 
    !r.metadata.trickName || 
    r.metadata.trickName === 'uncategorized' || 
    r.metadata.trickName === 'Other'
  );

  console.log(`Found ${uncategorized.length} uncategorized records\n`);
  console.log('Processing first 10 as a test...\n');

  const results: Array<{ id: string; original: string; suggested: string; text: string }> = [];

  for (let i = 0; i < Math.min(10, uncategorized.length); i++) {
    const record = uncategorized[i];
    const text = record.metadata.text || record.metadata.fullText || '';
    const videoTitle = record.metadata.videoTitle || '';
    
    console.log(`[${i + 1}/10] Processing: ${record.id}`);
    
    const category = await categorizeWithAI(text, videoTitle, genAI);
    
    results.push({
      id: record.id,
      original: record.metadata.trickName || 'uncategorized',
      suggested: category,
      text: text.substring(0, 150)
    });
    
    console.log(`  Original: ${record.metadata.trickName || 'uncategorized'}`);
    console.log(`  Suggested: ${category}`);
    console.log('');
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Save results
  const outputPath = path.join(__dirname, '../data/ai-categorization-test.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Test complete! Results saved to: ${outputPath}`);
  console.log('\nReview the results. If they look good, we can process all 695 records.');
}

main().catch(console.error);
