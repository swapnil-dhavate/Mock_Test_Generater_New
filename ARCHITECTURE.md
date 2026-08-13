# Nursing Ed-Tech Mock Test Platform Architecture

## 1. System Architecture Diagram

\`\`\`text
                               +-----------------------------------+
                               |           User Interface          |
                               | (React + Tailwind + Framer Motion)|
                               +-----------------------------------+
                                                ^
                                                |
                                      (REST API / JSON)
                                                |
                                                v
+-----------------------------------------------------------------------------------------+
|                                    Express.js Server                                    |
|                                                                                         |
|  +--------------------+   +-----------------------+   +------------------------------+  |
|  |   Mock Test API    |   | Quality Control Logic |   | Data Aggregation Controller  |  |
|  | (/api/ai/generate) |   | (Deduplication, Val.) |   | (Topics, Difficulty Bal.)    |  |
|  +--------------------+   +-----------------------+   +------------------------------+  |
|            |                                                         |                  |
|            v                                                         v                  |
|  +-------------------------------------------+     +---------------------------------+  |
|  |            AI Gateway Layer               |     |       External API Layer        |  |
|  | (Routing, Fallback, Load Balancing)       |     | (OpenTrivia, PubMed, OpenFDA)   |  |
|  +-------------------------------------------+     +---------------------------------+  |
|      |               |                 |                         |                      |
|      v               v                 v                         v                      |
| +---------+   +------------+   +----------------+      +------------------+             |
| | Gemini  |   | Groq (Llama)|  | OpenRouter(Mix)|      | Free Public APIs |             |
| | (Primary|   | (Fallback) |   | (Fallback 2)   |      +------------------+             |
| +---------+   +------------+   +----------------+                                       |
+-----------------------------------------------------------------------------------------+
                                                ^
                                                |
                                      (Read/Write cache)
                                                |
                                                v
+-----------------------------------------------------------------------------------------+
|                                Database & Caching Layer                                 |
| +-------------------------+ +-------------------------+ +-----------------------------+ |
| |       Firestore DB      | | Local Cache  (Redis/FS) | |  Static Weak Topics Pool    | |
| | (Users, Attempts, QBank)| | (qbank_cache.json)      | | (Analytics derived queries) | |
| +-------------------------+ +-------------------------+ +-----------------------------+ |
+-----------------------------------------------------------------------------------------+
\`\`\`

## 2. React Folder Structure
\`\`\`text
/src
 ├── /components
 │    ├── /ui                 # Reusable generic UI components (Buttons, Inputs, Cards)
 │    ├── /mock-test          # Test Engine specific components (Navigator, Loader, Timer)
 │    ├── /analytics          # Recharts components, Progress charts
 │    └── /admin              # Dashboard config components
 ├── /pages
 │    ├── /Dashboard.tsx      # Student performance hub
 │    ├── /ExamPrep.tsx       # Syllabus & Study Materials
 │    ├── /MockTest.tsx       # Config & Exam Interface
 │    ├── /Admin.tsx          # AI Source & Question Management
 ├── /lib
 │    ├── /utils.ts           # CSS and utility functions
 │    ├── /api.ts             # API client wrappers
 ├── /types
 │    ├── /schema.ts          # Global interfaces (Question, MockTest, etc.)
 ├── /store
 │    └── /useMockStore.ts    # Zustand store (State management for test taking)
 ├── /contexts
 │    └── /AuthContext.tsx    # Firebase Auth Context
 └── App.tsx                  # Main router setup
\`\`\`

## 3. Firebase Schema Architecture
\`\`\`javascript
// Collection: users
{
  uid: "string",
  displayName: "string",
  role: "student" | "admin",
  createdAt: timestamp
}

// Collection: questions (Master Bank)
{
  questionId: "string",
  category: "Technical" | "Non-Technical" | "Combined",
  subject: "string",
  topic: "string",
  difficulty: "Simple" | "Medium" | "Hard" | "Toughest",
  source: "AI" | "Manual" | "OpenTrivia" | "PubMed",
  sourceAPI: "Gemini" | "Groq" | null,
  verified: boolean,
  question: "string",
  options: ["string", "string", "string", "string"],
  correctAnswer: "string",
  explanation: "string",
  tags: ["string"]
}

// Collection: testAttempts (Analytics tracking)
{
  attemptId: "string",
  userId: "string",
  testId: "string", // Can be custom generated ID
  score: number,
  totalQuestions: number,
  timeSpentPerQuestion: { "questionId": seconds },
  responses: { "questionId": "selectedOption" },
  bookmarked: ["questionId"]
}
\`\`\`

## 4. Multi-Provider API Integration (AI Gateway)
The `AIGateway` acts as an orchestrator. It manages:
- **Primary Execution**: Attempts to run Gemini first.
- **Failover Logic**: Wraps requests in try/catch blocks; if one fails or times out, it moves to the next provider.
- **Normalization**: Formats output from different APIs to a consistent JSON structure required by the Mock Test component.

## 5. Aggregation Logic
For generating a combined test:
1. Try fetching existing categorized questions from `qbank_cache.json` / Database.
2. If the user asks for General Knowledge (GK), fire off asynchronous requests to Open Trivia DB.
3. For the remaining deficit, calculate needed questions per topic.
4. Execute `AIGateway.generateQuestions()` to fill the deficit.
5. Shuffle, validate formats, and return the final array within 3 seconds.
