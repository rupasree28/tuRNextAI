/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface User {
    id: string;
    username: string;
    email: string;
    name?: string; // Full name from Google
    picture?: string; // URL to profile picture from Google
    password?: string; // Hashed password, optional for Google users
    googleId?: string;
    bio?: string;
}

export interface Activity {
    userId: string;
    timestamp: Date;
    section: string;
    outcome: string;
}

export interface SimplifiedContent {
    shortSummary: string;
    bulletSummary: string[];
    simplifiedParagraph: string;
    keyTerms: { term: string; definition: string; }[];
}

export interface ExpandedContent {
    definition: string;
    workflow: string[];
    keyFeatures: string[];
    importance: string;
    flowchart: string;
    realWorldExamples: { example: string; explanation: string; }[];
    merits: string[];
    demerits: string[];
    detailedExplanation: string;
    youtubeSources: { title: string; link: string; relevance: string; }[];
    webSources: { title: string; link: string; }[];
    imagePrompts: { title: string; prompt: string; }[];
}

export interface ComprehensionQuestion {
    question: string;
    type: 'multiple-choice' | 'short-answer' | 'scenario';
    options?: string[];
    reference: string;
    correctAnswerIndex?: number; // Added for listening practice/quiz questions
}

export interface TestResult {
    overallFeedback: string;
    understandingLevel: 'weak' | 'moderate' | 'strong';
    areasToRevisit: string[];
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswerIndex: number;
}

export interface Quiz {
    topic: string;
    questions: QuizQuestion[];
}

export type ChallengeCategory = 'Puzzle' | 'Debate' | 'Design Task' | 'Jam' | 'Try & Analyze' | 'Quiz' | 'Image Puzzle' | 'Odd-One-Out' | 'Listening Practice';

export interface ThinkBotChallenge {
    category: ChallengeCategory;
    title: string;
    description: string;
    task: string;
    suggestedTime: number; // in minutes
    imageUrl?: string;
    items?: string[];
    story?: string;
    questions?: (QuizQuestion | ComprehensionQuestion)[];
}