/**
 * Domain Classifier
 * Uses snowboarding ontology to classify user questions and extract domain-specific intent
 * Bridges the semantic gap between general LLM understanding and snowboarding concepts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

interface OntologyData {
  concepts: Record<string, any>;
  problem_categories: Record<string, any>;
  trick_categories: Record<string, any>;
}

interface ClassificationResult {
  trick: string | null;
  concepts: string[];  // e.g., ["landing", "body_position", "commitment"]
  problem_category: string | null;  // e.g., "falling_forward"
  intent: 'learning' | 'troubleshooting' | 'comparison' | 'general';
  confidence: number;
  explanation: string;
}

let ontology: OntologyData | null = null;

export async function initializeDomainClassifier(): Promise<void> {
  if (ontology) return;
  
  try {
    const ontologyPath = path.join(process.cwd(), 'data', 'snowboarding-ontology.json');
    const data = fs.readFileSync(ontologyPath, 'utf-8');
    ontology = JSON.parse(data);
    console.log('✓ Domain classifier initialized with snowboarding ontology');
  } catch (error) {
    console.error('Failed to load snowboarding ontology:', error);
    throw error;
  }
}

export async function classifyQuestion(
  question: string,
  client: GoogleGenerativeAI
): Promise<ClassificationResult> {
  if (!ontology) {
    throw new Error('Domain classifier not initialized');
  }
  
  // Build ontology context for Gemini
  const conceptsList = Object.entries(ontology.concepts)
    .map(([name, data]: [string, any]) => `- ${name}: ${data.definition}`)
    .join('\n');
  
  const problemsList = Object.keys(ontology.problem_categories).join(', ');
  
  const prompt = `You are a snowboarding domain expert. Analyze this question using the snowboarding ontology provided.

SNOWBOARDING CONCEPTS:
${conceptsList}

PROBLEM CATEGORIES: ${problemsList}

USER QUESTION: "${question}"

Extract and classify:
1. Trick name (if mentioned) - use exact names like "backside-360", "frontside-720", etc.
2. Relevant concepts from the ontology (e.g., "landing", "rotation", "body_position")
3. Problem category if it's a troubleshooting question
4. Intent type: "learning" (how to do), "troubleshooting" (why isn't it working), "comparison" (vs other tricks), or "general"
5. Confidence (0-1) in your classification

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "trick": "backside-360" or null,
  "concepts": ["landing", "body_position"],
  "problem_category": "falling_forward" or null,
  "intent": "troubleshooting",
  "confidence": 0.95,
  "explanation": "User is asking about landing issues on backside 360s"
}`;

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse classification response:', responseText);
      return {
        trick: null,
        concepts: [],
        problem_category: null,
        intent: 'general',
        confidence: 0,
        explanation: 'Failed to classify'
      };
    }
    
    const classification = JSON.parse(jsonMatch[0]) as ClassificationResult;
    
    console.log('=== Domain Classification ===');
    console.log('Question:', question);
    console.log('Trick:', classification.trick);
    console.log('Concepts:', classification.concepts.join(', '));
    console.log('Problem:', classification.problem_category);
    console.log('Intent:', classification.intent);
    console.log('Confidence:', classification.confidence);
    
    return classification;
  } catch (error) {
    console.error('Error classifying question:', error);
    return {
      trick: null,
      concepts: [],
      problem_category: null,
      intent: 'general',
      confidence: 0,
      explanation: 'Classification error'
    };
  }
}

export function getConceptDefinition(conceptName: string): string | null {
  if (!ontology) return null;
  const concept = ontology.concepts[conceptName];
  return concept ? concept.definition : null;
}

export function getProblemSolutions(problemCategory: string): string[] {
  if (!ontology) return [];
  const problem = ontology.problem_categories[problemCategory];
  return problem ? problem.solutions : [];
}

export function getRelatedConcepts(conceptName: string): string[] {
  if (!ontology) return [];
  const concept = ontology.concepts[conceptName];
  return concept ? concept.related_problems || [] : [];
}
