import fs from 'fs';
import path from 'path';

export interface Question {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  rationale?: string;
  optionAnalysis?: Record<string, string>;
  keyConcept?: string;
  quickRevision?: string;
  memoryTrick?: string;
  clinicalSignificance?: string;
  examTip?: string;
  wrongExplanations?: string[];
  difficulty: string;
  category: string;
  subtopic: string;
  sourceAPI?: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generateQuestions(prompt: string, sysInst: string, count: number): Promise<Question[]>;
}

export class GeminiProvider implements AIProvider {
  name = "Gemini";
  private ai: any;

  constructor(aiClient: any) {
    this.ai = aiClient;
  }

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async generateQuestions(prompt: string, sysInst: string, count: number): Promise<Question[]> {
     const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: sysInst,
          responseMimeType: "application/json",
          // Removed strict schema constraint to avoid mismatch errors if the API slightly deviates,
          // We will parse dynamically.
        }
     });
     
      let jsonStr = response.text?.trim() || "[]";
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
      
      const parsed = JSON.parse(jsonStr.trim());
      
      return Array.isArray(parsed) ? parsed.map(q => ({...q, sourceAPI: 'Gemini'})) : [];
  }
}

export class GroqProvider implements AIProvider {
  name = "Groq";
  isAvailable(): boolean {
    // Return true if mock keys are present (for demonstration of fallback capability)
    return !!process.env.GROQ_API_KEY || process.env.ENABLE_MOCK_FALLBACK === 'true';
  }
  
  async generateQuestions(prompt: string, sysInst: string, count: number): Promise<Question[]> {
    if (!process.env.GROQ_API_KEY) {
        console.warn("[GroqProvider] No real API key, simulating failure to trigger next fallback.");
        throw new Error("Groq API key not provided.");
    }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: sysInst },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });
    
    if (!res.ok) throw new Error("Groq API returned an error");
    const json = await res.json();
    const content = json.choices[0].message.content;
    const parsed = JSON.parse(content);
    const questions = parsed.questions || parsed;
    return Array.isArray(questions) ? questions.map(q => ({...q, sourceAPI: 'Groq Llama3'})) : [];
  }
}

export class AIGateway {
  private providers: AIProvider[] = [];

  constructor(aiClient: any) {
    // Ranked by priority and speed
    this.providers.push(new GeminiProvider(aiClient));
    this.providers.push(new GroqProvider());
  }

  getProviderStatus(): { name: string; available: boolean }[] {
    return this.providers.map(p => ({ name: p.name, available: p.isAvailable() }));
  }

  async generateQuestions(prompt: string, sysInst: string, count: number): Promise<Question[]> {
    let lastError = null;
    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
         console.log(`[AIGateway] Provider ${provider.name} is not available (missing keys). Skipping.`);
         continue;
      }
      try {
        console.log(`[AIGateway] Attempting generation with ${provider.name}...`);
        const result = await provider.generateQuestions(prompt, sysInst, count);
        
        if (result && result.length > 0) {
          console.log(`[AIGateway] Success with ${provider.name}`);
          return result.slice(0, count);
        }
      } catch (err) {
        console.error(`[AIGateway] Provider ${provider.name} failed:`, err);
        lastError = err;
      }
    }
    
    console.error("[AIGateway] All AI Providers failed. Using emergency fallback.");
    // Emergency fallback to prevent complete failure
    const fallbackQuestions: Question[] = [];
    for (let i = 0; i < count; i++) {
        fallbackQuestions.push({
            id: 'fallback-' + i,
            question: `Emergency Fallback Question ${i + 1} for ${prompt.slice(0, 50)}...`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A',
            explanation: 'This is an auto-generated fallback question because the AI providers are currently unavailable due to high demand or rate limits.',
            difficulty: 'Medium',
            category: 'General',
            subtopic: 'Fallback',
            sourceAPI: 'Emergency Cache'
        });
    }
    return fallbackQuestions;
  }
}
