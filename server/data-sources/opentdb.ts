export async function fetchOpenTriviaQuestions(count: number, category: string, difficulty: string): Promise<any[]> {
  try {
    // Map our categories to Open Trivia categories optionally. 
    // OpenTrivia General Knowledge is category=9
    // Science: Computers = 18, Math = 19
    let catQuery = "";
    if (category.toLowerCase().includes('gk') || category.toLowerCase().includes('general knowledge')) catQuery = "&category=9";
    if (category.toLowerCase().includes('math')) catQuery = "&category=19";
    
    // Difficulty mapping (easy, medium, hard)
    let diffQuery = "";
    if (['easy', 'medium', 'hard'].includes(difficulty.toLowerCase())) {
        diffQuery = `&difficulty=${difficulty.toLowerCase()}`;
    }

    const maxCount = Math.min(count, 50); // OpenTrivia max is 50
    const url = `https://opentdb.com/api.php?amount=${maxCount}${catQuery}${diffQuery}&type=multiple`;

    console.log(`[OpenTrivia] Fetching external data...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch from OpenTrivia");
    
    const data = await res.json();
    
    if (data.response_code === 0 && data.results) {
       return data.results.map((q: any) => {
         const decodedQuestion = decodeHTMLEntities(q.question);
         const decodedCorrect = decodeHTMLEntities(q.correct_answer);
         const decodedIncorrect = q.incorrect_answers.map(decodeHTMLEntities);
         
         const options = [decodedCorrect, ...decodedIncorrect].sort(() => Math.random() - 0.5);
         
         return {
            id: Math.random().toString(36).substring(2, 10),
            question: decodedQuestion,
            options: options,
            correctAnswer: decodedCorrect,
            explanation: "Conceptual explanation available via AI Mentor.", // OpenTrivia doesn't provide explanations
            difficulty: q.difficulty,
            category: 'Non-Technical',
            subtopic: q.category,
            sourceAPI: 'OpenTriviaDB'
         };
       });
    }
    return [];
  } catch (error) {
    console.error("[OpenTrivia] Error:", error);
    return [];
  }
}

// Helper to decode HTML entities returned by open trivia
function decodeHTMLEntities(text: string) {
    const map: any = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&rsquo;': "'",
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&shy;': ''
    };
    return text.replace(/&[\w\d#]+;/g, (m) => map[m] || m);
}
