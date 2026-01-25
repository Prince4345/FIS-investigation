
// Google Gemini Service (Stable SDK)
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CrimeCase, Evidence, Witness, TimelineEvent } from "./types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) console.warn("Missing VITE_GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(API_KEY || "");

export async function analyzeForensicCase(
  crimeCase: CrimeCase,
  evidence: Evidence[],
  witnesses: Witness[],
  timeline: TimelineEvent[]
) {
  // 🔥 STEP 2: Unified Simple Config (Prompt Engineering Approach)
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.2,
    },
  }, { apiVersion: 'v1' });

  const prompt = `
    You are the Lead Forensic Investigator for the F.I.E. (Forensic Insight Engine).
    Your goal is to analyze the provided crime case data to identify:
    1. Critical Inconsistencies (where witness statements contradict evidence or other witnesses).
    2. Timeline Anomalies (impossible travel times, missing gaps, order of events).
    3. Hidden Patterns (motive connections, repeated behaviors).

    Respond in clear, professional English.

    Case Title: ${crimeCase.title}
    Summary: ${crimeCase.summary}
    
    === EVIDENCE LOG ===
    ${evidence.map(e => `[${e.id}] ${e.name} (${e.type}): ${e.description}`).join('\n')}
    
    === WITNESS TESTIMONY ===
    ${witnesses.map(w => `[${w.id}] ${w.name} (Reliability: ${w.reliabilityScore}%): "${w.statement}"`).join('\n')}
    
    === CHRONOLOGICAL DATA ===
    ${timeline.map(t => `[${t.time}] ${t.title}: ${t.description}`).join('\n')}

    INSTRUCTIONS:
    1. Think step-by-step. First, map the timeline. Second, cross-reference every witness statement against the physical evidence.
    2. If a witness has low reliability (<50%), scrutinize their statement for potential deception.
    3. Generate a list of 'Forensic Observations'.
    
    CRITICAL OUTPUT RULES:
    - You must populate the 'correlations' array with references to the items that support your observation.
    - 'sourceType' MUST be one of: 'evidence', 'witness', 'timeline'.
    - 'refId' MUST match the EXACT ID in the brackets [] above. e.g. if evidence is [rec_123], refId is 'rec_123'. Do not invent IDs.
    - 'label' should be a short, punchy display name for the graph node.
    - Provide a confidence level (0-100) based on how strong the evidence is.

    ✅ STEP 3: Enforce JSON via PROMPT
    IMPORTANT:
    Return ONLY valid JSON.
    Do not include markdown.
    Do not include explanations.
    The response must be a JSON array of objects with the following fields:
    id, type, observation, reasoning, correlations, confidence, limitations.
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 🔥 STEP 4: Keep parser (already correct)
    // Clean markdown formatting (Gemini often wraps JSON in backticks)
    const cleanedText = responseText
      .replace(/```json\n?|\n?```/g, "")
      .trim();

    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    return [];
  }
}
