import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { AIGateway, Question } from "./server/ai-gateway";
import { fetchOpenTriviaQuestions } from "./server/data-sources/opentdb";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Builds a Supabase client scoped to the calling user's own JWT (forwarded from the browser),
// so question-bank reads/writes respect RLS as that authenticated user. No service-role key involved.
function getScopedSupabase(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
}

function questionToDbRow(q: any) {
  return {
    question: q.question,
    options: q.options,
    correct_answer: q.correctAnswer,
    rationale: q.rationale || q.explanation || null,
    option_analysis: q.optionAnalysis || null,
    key_concept: q.keyConcept || null,
    quick_revision: q.quickRevision || null,
    memory_trick: q.memoryTrick || null,
    clinical_significance: q.clinicalSignificance || null,
    exam_tip: q.examTip || null,
    difficulty: q.difficulty,
    category: q.category,
    subtopic: q.subtopic,
    source_api: q.sourceAPI || null,
    language: q.language || 'en',
    script: q.script || 'Latin'
  };
}

function dbRowToQuestion(row: any) {
  return {
    id: row.id,
    question: row.question,
    options: row.options,
    correctAnswer: row.correct_answer,
    explanation: row.rationale,
    rationale: row.rationale,
    optionAnalysis: row.option_analysis,
    keyConcept: row.key_concept,
    quickRevision: row.quick_revision,
    memoryTrick: row.memory_trick,
    clinicalSignificance: row.clinical_significance,
    examTip: row.exam_tip,
    difficulty: row.difficulty,
    category: row.category,
    subtopic: row.subtopic,
    sourceAPI: row.source_api,
    language: row.language,
    script: row.script,
    encoding: 'UTF-8'
  };
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const aiGateway = new AIGateway(ai);

const CACHE_FILE = path.join(process.cwd(), 'qbank_cache.json');
let questionBank: any[] = [];
if (fs.existsSync(CACHE_FILE)) {
  try {
    questionBank = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch (e) {
    console.error("Failed to parse cache", e);
  }
}

const saveCache = () => {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(questionBank, null, 2));
  } catch (e) {
    console.error("Failed to update cache file", e);
  }
};

export const app = express();
app.use(express.json());

// API Routes
app.get("/api/admin/gateway-status", (req, res) => {
  res.json({
    providers: aiGateway.getProviderStatus(),
    dataSources: [
      { name: "OpenTrivia", available: true, count: questionBank.length }
    ]
  });
});

// AI Question Generator Endpoint
app.post("/api/ai/generate-questions", async (req, res) => {
  try {
    const { topics = [], difficulty, count = 5, categoryMode = 'technical' } = req.body;
    const topicString = Array.isArray(topics) && topics.length > 0 ? topics.join(', ') : 'General Knowledge';
    const scopedSupabase = getScopedSupabase(req);

    // Prefer the real, persistent question bank (shared across every user/deploy) over the ephemeral in-memory one.
    let matched: any[] = [];
    if (scopedSupabase) {
      try {
        let query = scopedSupabase.from('questions').select('*').eq('status', 'published');
        if (!difficulty.includes('Mixed')) query = query.eq('difficulty', difficulty);
        const { data, error } = await query.limit(500);
        if (!error && data) {
          matched = data
            .filter((row: any) => {
              if (!Array.isArray(topics) || topics.length === 0) return true;
              return topics.some((t: string) => t.includes(row.subtopic) || t.includes(row.category) || row.subtopic === t || row.category === t);
            })
            .map(dbRowToQuestion);
        }
      } catch (e) {
        console.warn("Supabase question-bank lookup failed, falling back to in-memory cache", e);
      }
    }

    // Fall back to the ephemeral in-memory cache if Supabase wasn't reachable or returned nothing
    if (matched.length === 0) {
      matched = questionBank.filter(q => {
        const matchesTopic = Array.isArray(topics) && topics.length > 0
           ? (topics.includes(q.subtopic) || topics.includes(q.category))
           : true;
        const isDifficultyMatched = difficulty.includes('Mixed') ? true : q.difficulty === difficulty;
        return matchesTopic && isDifficultyMatched;
      });
    }

    // Shuffle matched questions to provide variety
    matched = matched.sort(() => Math.random() - 0.5);

    if (matched.length >= count) {
      return res.json(matched.slice(0, count));
    }

    // Calculate how many more questions we need to generate
    const needed = Math.max(0, count - matched.length);
    
    // Fetch in parallel chunks for maximum speed (Gateway handles parallel requests well)
    const BATCH_SIZE = 10; // Max 10 questions per batch for detailed NCLEX rationales
    const batches = Math.ceil(needed / BATCH_SIZE);
    const generatePromises = [];
    
    // External sources injection
    // If Non-Technical or Combined is requested, try fetching from Open Trivia DB in parallel to supplement
    const includeExternal = (categoryMode === 'non-technical' || categoryMode === 'combined') && 
                            (topics.includes('General Knowledge (GK)') || topics.includes('Science') || topics.length === 0);
    
    let externalDataPromise = null;
    if (includeExternal) {
        // Attempt to fetch 30-50% of the needed questions from Open Trivia DB to reduce latency & AI load
        const externalCount = Math.min(needed, Math.ceil(needed * 0.4));
        externalDataPromise = fetchOpenTriviaQuestions(externalCount, 'General Knowledge', difficulty);
    }
    
    for(let i=0; i < batches; i++) {
       const batchCount = (i === batches - 1) ? (needed - i * BATCH_SIZE) : BATCH_SIZE;
       if (batchCount <= 0) continue;
       
       let promptStr = '';
       let sysInst = '';
 
       const isMarathi = topics.includes('Marathi') || topicString.toLowerCase().includes('marathi');
       const marathiInstruction = isMarathi 
          ? " IMPORTANT: The questions, options, correctAnswer, and explanations MUST be generated entirely in the Marathi language using the Devanagari script (UTF-8). Ensure grammatically correct Marathi formatting and vocabulary."
          : "";

       const requiredFieldsMsg = " Output STRICT valid JSON array of objects. Fields: question, options (Array of 4 options), correctAnswer, rationale (Detailed explanation why correct and why others wrong), optionAnalysis (Object with keys A, B, C, D mapping to explanation of each option), keyConcept, quickRevision, memoryTrick, clinicalSignificance, examTip, difficulty, category, subtopic.";

       if (categoryMode === 'technical') {
          promptStr = `Generate exactly ${batchCount} highly unique nursing exam multiple choice questions covering these topics: ${topicString}. Difficulty: ${difficulty}. Focus on clinical reasoning, CBT patterns, and varied scenarios. Distribute questions evenly across topics. Ensure no duplicate concepts.${isMarathi ? " Generate in Marathi language." : ""}`;
          sysInst = "You are a Senior Nursing Education Expert and Psychometric Assessment Specialist. Generate highly accurate, clinical case-based nursing questions in JSON format. Provide detailed NCLEX-level rationales for each option." + marathiInstruction + requiredFieldsMsg;
       } else if (categoryMode === 'non-technical') {
          promptStr = `Generate exactly ${batchCount} highly unique multiple choice questions covering these general subjects: ${topicString}. Difficulty: ${difficulty}. Focus on accurate concepts. Distribute questions evenly across topics. Ensure no duplicate concepts.${isMarathi ? " Generate in Marathi language." : ""}`;
          sysInst = "You are an Expert Examiner for competitive exams. Generate high-quality multiple choice questions in JSON format. Provide detailed step-by-step rationales, option-by-option analysis, and shortcut tricks." + marathiInstruction + requiredFieldsMsg;
       } else {
          promptStr = `Generate exactly ${batchCount} highly unique multiple choice questions covering a mix of nursing and general subjects: ${topicString}. Difficulty: ${difficulty}. Distribute questions evenly across the provided topics.${isMarathi ? " Ensure Marathi topics are generated in Marathi language." : ""}`;
          sysInst = "You are a Senior Assessment Specialist. Generate high-quality multiple choice questions in JSON format. Provide clear conceptual explanations, option-by-option analysis, and memory tricks." + marathiInstruction + requiredFieldsMsg;
       }

       generatePromises.push(
          aiGateway.generateQuestions(promptStr, sysInst, batchCount)
       );
    }
    
    // Await all AI promises + External Data
    let externalQuestions: any[] = [];
    if (externalDataPromise) {
        generatePromises.push(externalDataPromise.then(res => {
           externalQuestions = res;
           return []; // return empty to the AI results array so it's handled separately
        }).catch(e => {
           console.error("OpenTrivia error, ignoring...", e);
           return [];
        }));
    }

    const results = await Promise.allSettled(generatePromises);
    let newQs: any[] = [];
    
    for(const resObj of results) {
       if (resObj.status === 'fulfilled' && Array.isArray(resObj.value)) {
          newQs.push(...resObj.value);
       }
    }

    // Add unique IDs and save to cache
    for (const q of newQs) {
      if (!q.id) {
        q.id = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      }

      let language = 'en';
      if (topics.includes('Marathi') || q.subtopic === 'Marathi' || topicString.toLowerCase().includes('marathi')) {
          language = 'mr';
      }
      q.language = language;
      q.script = language === 'mr' ? 'Devanagari' : 'Latin';
      q.encoding = 'UTF-8';

      questionBank.push(q);
    }

    // Merge External Data
    if (externalQuestions.length > 0) {
       newQs.push(...externalQuestions);
    }

    // Fire and forget cache save
    setTimeout(saveCache, 0);

    // Persist newly generated questions to the real, shared question bank (fire and forget)
    if (scopedSupabase && newQs.length > 0) {
      scopedSupabase.from('questions').insert(newQs.map(questionToDbRow)).then(({ error }) => {
        if (error) console.warn("Failed to persist generated questions to Supabase", error);
      });
    }

    // Combine matched from cache and newly generated questions
    const finalSet = [...matched, ...newQs].sort(() => Math.random() - 0.5).slice(0, count);
    res.json(finalSet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// AI Doubt Solver Chat Endpoint
app.post("/api/ai/doubt-solver", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: "You are an AI Clinical Mentor and Senior Nursing Educator. Explain medical/nursing concepts deeply, beautifully, and structurally. Use simple words but retain medical accuracy. Offer mnemonics if helpful."
      }
    });
    res.json({ reply: response.text });
  } catch (error: any) {
    console.error(error);
    if (error && error.message && (error.message.includes('429') || error.message.includes('503'))) {
       res.json({ reply: "I'm currently assisting many students and experiencing high demand. Please give me a moment and try again shortly!" });
    } else {
       res.status(500).json({ error: "Failed to process doubt" });
    }
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT as number, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer().catch(console.error);
}

