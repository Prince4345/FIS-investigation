
// Google Gemini Service
import { GoogleGenAI, Type } from "@google/genai";
import { CrimeCase, Evidence, Witness, TimelineEvent } from "./types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
if (!API_KEY) console.warn("Missing VITE_GEMINI_API_KEY");

const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

export async function analyzeForensicCase(
  crimeCase: CrimeCase,
  evidence: Evidence[],
  witnesses: Witness[],
  timeline: TimelineEvent[]
) {
  const prompt = `
    You are the Lead Forensic Investigator for the F.I.E. (Forensic Insight Engine).
    Your goal is to analyze the provided crime case data to identify:
  1. Critical Inconsistencies(where witness statements contradict evidence or other witnesses).
    2. Timeline Anomalies(impossible travel times, missing gaps, order of events).
    3. Hidden Patterns(motive connections, repeated behaviors).

  Respond in clear, professional English.

    Case Title: ${crimeCase.title}
  Summary: ${crimeCase.summary}
    
    === EVIDENCE LIG ===
    ${evidence.map(e => `[${e.id}] ${e.name} (${e.type}): ${e.description}`).join('\n')}
    
    === WITNESS TESTIMONY ===
    ${witnesses.map(w => `[${w.id}] ${w.name} (Reliability: ${w.reliabilityScore}%): "${w.statement}"`).join('\n')}
    
    === CHRONOLOGICAL DATA ===
    ${timeline.map(t => `[${t.time}] ${t.title}: ${t.description}`).join('\n')}

  INSTRUCTIONS:
  1.  Think step - by - step.First, map the timeline.Second, cross - reference every witness statement against the physical evidence.
    2.  If a witness has low reliability(<50%), scrutinize their statement for potential deception.
    3.  Generate a list of 'Forensic Observations'.
    
    CRITICAL OUTPUT RULES:
  - You must populate the 'correlations' array with references to the items that support your observation.
    - 'sourceType' MUST be one of: 'evidence', 'witness', 'timeline'.
    - 'refId' MUST match the EXACT ID in the brackets[] above.e.g.if evidence is[rec_123], refId is 'rec_123'.Do not invent IDs.
    - 'label' should be a short, punchy display name for the graph node.
    
    Provide a confidence level(0 - 100) based on how strong the evidence is.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash-001',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: {
              type: Type.STRING,
              enum: ['inconsistency', 'delay', 'pattern']
            },
            observation: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            correlations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceType: { type: Type.STRING, enum: ['evidence', 'witness', 'timeline'] },
                  refId: { type: Type.STRING },
                  label: { type: Type.STRING },
                  snippet: { type: Type.STRING }
                },
                required: ['sourceType', 'refId', 'label', 'snippet']
              }
            },
            confidence: { type: Type.NUMBER },
            limitations: { type: Type.STRING },
          },
          required: ['id', 'type', 'observation', 'reasoning', 'correlations', 'confidence', 'limitations']
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    return [];
  }
}
