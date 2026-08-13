// src/types/schema.ts

export type QuestionType = 'MCQ' | 'MULTIPLE_SELECT' | 'TRUE_FALSE';
export type DifficultyLevel = 'Simple' | 'Medium' | 'Hard' | 'Toughest';
export type Category = 'Technical' | 'Non-Technical' | 'Combined';

export interface Question {
  questionId: string;
  category: Category;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: DifficultyLevel;
  language: string; // 'en', 'mr', 'hi'
  questionType: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  aiExplanation?: string;
  marks: number;
  negativeMarks: number;
  estimatedTime: number; // in seconds
  tags: string[];
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
}

export interface MockTest {
  testId: string;
  userId: string;
  categories: Category[];
  subjects: string[];
  difficulty: string;
  questionCount: number;
  duration: number; // in seconds
  settings: {
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    negativeMarking: boolean;
    showImmediateAnswers: boolean;
  };
  generatedQuestions: string[]; // Array of string questionIds
  timeSpent: number;
  score: number;
  status: 'ip' | 'completed' | 'abandoned';
  createdAt: any;
}

export interface TestAttempt {
  attemptId: string;
  testId: string;
  userId: string;
  responses: Record<string, string>; // questionId -> selectedOption
  bookmarked: string[]; // array of questionIds
  timeSpentPerQuestion: Record<string, number>; // questionId -> seconds
  totalScore: number;
  accuracy: number;
  completedAt: any;
}

export interface UserAnalytics {
  userId: string;
  overallAccuracy: number;
  testsAttempted: number;
  totalTimeSpent: number; // seconds
  strengthTopics: string[];
  weakTopics: string[];
  subjectAccuracy: Record<string, number>;
  difficultyAccuracy: Record<string, number>;
  lastCalculated: any;
}

// Map collections
export interface FirestoreSchema {
  users: Record<string, any>;
  subjects: Record<string, any>;
  topics: Record<string, any>;
  questions: Record<string, Question>;
  mockTests: Record<string, MockTest>;
  testAttempts: Record<string, TestAttempt>;
  analytics: Record<string, UserAnalytics>;
}
