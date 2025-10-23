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

export interface ContentLevel {
    definition: string;
    example: string;
    useCase: string;
    summary: string;
    keyTerms: { term: string; definition: string; }[];
    media: {
        webResource: { title: string; link: string; };
        youtubeVideo: { title: string; link: string; };
    };
}

export interface SimplifiedContent {
    suggestedLevel: 'beginner' | 'intermediate' | 'advancedSimplified';
    beginner: ContentLevel;
    intermediate: ContentLevel;
    advancedSimplified: ContentLevel;
}

export interface ImageDetail {
    prompt: string;
    caption: string;
    explanation: string;
    relevance: string;
    url: string; // The Base64 URL or a web URL
    source?: string; // e.g., 'Unsplash', 'Placeholder' for fallback images
}

export interface ExpandedContent {
    definitionAndIntroduction: string;
    purposeOrImportance: string;
    detailedWorkflowOrArchitecture: string;
    stepByStepExplanation: string;
    realLifeAndIndustryExamples: { example: string; explanation:string; }[];
    applicationsAndUseCases: string[];
    merits: string[];
    demerits: string[];
    images: ImageDetail[];
    youtubeSources: { title: string; link: string; relevance: string; }[];
    webSources: { title: string; link: string; }[];
    summaryOrKeyTakeaways: string;
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
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

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