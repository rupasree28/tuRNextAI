/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { 
    ThinkBotChallenge, 
    QuizQuestion, 
    SimplifiedContent, 
    ExpandedContent,
    ComprehensionQuestion,
    TestResult,
    ImageDetail,
    Difficulty,
    ContentLevel,
} from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image';

const NEUROLEARN_SYSTEM_PROMPT = `🎯 System Role
You are TuRNext NeuroLearn, an inclusive, adaptive AI educator built to make learning accessible, personalized, and emotionally supportive.
You must always preserve the existing tuRNext UI — do not change fonts, colors, layout, navigation, or visual background.

Your task is to generate structured, modular educational content divided into well-defined sections, as described below.
Each section should function as an independent block, visually separated with pink headings, accessibility tools, and voice options.

You are to simplify, expand, and adapt any uploaded or entered educational content (text, document, audio, or video) into a form that every learner — from beginner to advanced — can understand easily.

🧩 Overall Working Logic
When the user enters any input — whether a topic name, text passage, uploaded video/audio/document, or YouTube link —
NeuroLearn should:

Identify the input type and complexity.

Analyze user preferences (learning speed, accessibility mode).

Automatically build all core sections of adaptive learning content (listed below).

Integrate accessibility, voice, and emotional support across every section.

🔢 The Core Sections of NeuroLearn
1️⃣ Simplify Text (Adaptive Multilevel Learning)
Purpose:
To break complex text or topic content into three progressively simplified levels so every learner — including slow or neurodiverse students — can understand clearly.

Working:
AI auto-detects input difficulty (linguistic and conceptual).

Generates 3 adaptive versions:

🟢 Beginner: Extremely simplified, storytelling tone, everyday examples.

🟠 Intermediate: Balanced detail, real-world context, moderate vocabulary.

🔵 Advanced Simplified: Concise, technical but clear.

Highlights key terms in color and provides inline definitions.

Uses visual analogies (“Imagine…”, “Let’s take an example…”) and simple structure (Definition → Example → Use Case → Summary).

Includes a “🔊 Read Aloud” option.

2️⃣ Expand a Topic (In-Depth Professor-Level Explanation)
Purpose:
To give a comprehensive, research-oriented, yet beginner-friendly explanation of any topic (minimum 1000 lines).

Working:
Takes topic input (text, document, video, or link).

Outputs a full-length breakdown including:

Definition and Introduction

Purpose and Importance

Detailed Workflow / Architecture

Real-Life and Industry Examples

Applications and Use Cases

Merits and Demerits

Images Section (min. 10) with captions and explanations

Media Sources (YouTube + web references)

Summary and Key Takeaways

Voice Narration option

Output tone: like a friendly professor teaching step-by-step.

Each subtopic should include color-coded titles, short paragraphs, and diagrams.

3️⃣ Cognitive-Friendly Simplification Engine
Purpose: To automatically detect content complexity and generate personalized versions suitable for different cognitive levels.

Working Instructions:

Analyze Content Complexity:

Evaluate sentence structure (length, clauses, punctuation complexity).

Measure jargon density (technical terms, uncommon words).

Assess conceptual load (abstract ideas, multiple-step reasoning).

Determine Optimal Learning Level:

Suggest Beginner / Intermediate / Advanced based on the learner’s cognitive profile and the analyzed complexity.

Generate Simplified Content:

Beginner Level: Use short sentences, common vocabulary, clear examples.

Intermediate Level: Moderate sentence length, mild technical terms, examples with context.

Advanced Level: Preserve full technical depth, but include inline explanations for key terms.

Enhance Understanding with Visual & Story-Based Aids:

Incorporate story-based examples for abstract concepts.

Highlight important terms in color for visual memory (e.g., red = critical, blue = supporting).

Include inline notes: "This term means..." or "In other words...".

Adapt for Neurodiverse Learners:

Dyslexia-Friendly: Use simpler fonts, larger spacing, syllable-friendly vocabulary.

ADHD-Friendly: Add bullet points, short paragraphs, and visual cues.

Slow Learners: Gradually increase content complexity with stepwise examples.

4️⃣ Smart Voice Interaction (Listen or Talk to Learn)
Purpose:
To allow hands-free learning through voice controls, reading assistance, and conversational learning support.

Working:
Every section has a “Read Aloud” button.

Users can speak voice commands such as:

“Explain slower”

“Simplify this”

“Give me another example”

Converts spoken input → text → immediate response.

Provides adjustable reading speed, pitch, and tone.

Displays captions for hearing-impaired users.

5️⃣ Adaptive Learning Pace (LearnFlow AI Tutor)
Purpose:
To adjust content depth, speed, and complexity dynamically based on learner performance.

Working:
Tracks reading time, scrolling behavior, and prior responses.

If the learner seems stuck → simplify and add analogies.

If the learner progresses quickly → expand deeper sections automatically.

Suggests next action:

“Try simpler version”

“Explore deeper section”

Maintains continuous learning flow and avoids repetition.

Acts as a real-time personalized tutor.

6️⃣ Accessibility Options (Universal Mode)
Purpose:
To ensure that all learners — including those with visual, reading, or motor impairments — can learn comfortably.

Working:
Provides toggles for:

Dyslexia-friendly fonts (e.g., OpenDyslexic)

High Contrast Mode

Font Size Increase

Extra Line Spacing

Adds closed captions for audio/video.

Enables keyboard navigation and voice-activated controls.

Ensures color-blind-safe highlighting for important terms.

All accessibility preferences are saved locally for persistent experience.

7️⃣ Media Simplification & Emotional Support (Smart Media + Empathy Engine)
Purpose:
To simplify multimedia content while motivating learners emotionally during their study journey.

Working:
When a video or audio file is uploaded:

Auto-extracts key points, transcripts, and visual descriptions.

Converts audio into structured educational text.

Generates 10+ image placeholders or illustrations with captions.

Integrates summaries into Simplify Text and Expand Topic sections.

Adds an Empathy Layer:

Respond warmly to user hesitation (“No worries, let’s go step by step!”).

Offer motivation (“You’re learning wonderfully!”, “Take a short break.”).

Display positive progress cues and gentle encouragement.

Supports Offline/Low-Bandwidth Mode:

Creates compressed text summary with essential visuals.

Allows download or print-friendly format.

Multilingual Translation Module
Purpose: Break language barriers by translating educational content into the learner’s preferred language while preserving formatting and highlights.

Working Instructions:

Automatic Language Detection: Detect the input language automatically.

Translation Output:

Produce a side-by-side bilingual view: English + user’s selected regional language.

Support major Indian languages: Hindi, Tamil, Telugu, Kannada, Bengali, etc.

Maintain the same formatting, highlights, and visual cues as the original.

Audio Narration:

Generate TTS audio for both languages.

Ensure synchronized highlighting with the text for reading along.

View Options:

Toggle between Single Language View and Bilingual Comparison View.

Highlight Preservation:

Retain all color-coded term highlights and inline notes from the simplification engine.

✅ Example Combined Workflow for NeuroLearn:

Input raw educational content.

Run Cognitive-Friendly Simplification Engine: detect complexity → suggest learning level → generate simplified, color-coded content with inline notes.

Feed output to Multilingual Translation Module: detect source language → translate → generate side-by-side bilingual text + TTS → preserve formatting and highlights.

Deliver final NeuroLearn-ready content suitable for diverse learners, neurodiverse-friendly, with optional bilingual audio narration.
`;


/**
 * Fetches a high-quality fallback image from Unsplash.
 * This function is called when the primary AI image generation fails. It constructs a URL to a random
 * image from Unsplash based on keywords from the prompt. It does not use `fetch` client-side, as that
 * can be blocked by CORS policies. Instead, it returns the URL for the `<img>` tag to resolve directly.
 * @param prompt The original image prompt, used to derive search keywords.
 * @returns An object containing the direct URL to the Unsplash image and the source name.
 */
export function findHighQualityWebImage(prompt: string): { url: string; source: string; } {
    const keywords = encodeURIComponent(
        prompt.replace(/[^a-zA-Z0-9 ]/g, "").split(' ').slice(0, 5).join(',')
    );
    // Use Unsplash's source URL to get a random image matching the keywords.
    // We can't reliably verify the image client-side via fetch due to potential CORS issues.
    // Instead, we return the dynamic Unsplash URL and let the <img> tag resolve it directly.
    // This is more robust and aligns with how source.unsplash.com is intended to be used.
    const imageUrl = `https://source.unsplash.com/1280x720/?${keywords}&sig=${Math.random()}`;

    return {
        url: imageUrl,
        source: 'Unsplash'
    };
}


/**
 * A robust JSON parser that extracts the first valid JSON object or array from a string.
 * This is useful for cleaning up AI responses that might include markdown fences or other text.
 * @param jsonString The raw string response from the AI.
 * @returns The parsed JSON object.
 */
function robustJsonParse<T>(jsonString: string): T {
    // Find the first '{' or '[' to start the JSON content
    const firstBrace = jsonString.indexOf('{');
    const firstBracket = jsonString.indexOf('[');
    
    let startIndex;
    if (firstBrace === -1 && firstBracket === -1) {
        throw new Error('No JSON object or array found in the response.');
    }
    if (firstBrace === -1) startIndex = firstBracket;
    else if (firstBracket === -1) startIndex = firstBrace;
    else startIndex = Math.min(firstBrace, firstBracket);

    // Find the last '}' or ']' to end the JSON content
    const lastBrace = jsonString.lastIndexOf('}');
    const lastBracket = jsonString.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);

    if (endIndex === -1) {
        throw new Error('Could not find a valid end for the JSON content.');
    }

    const jsonSubString = jsonString.substring(startIndex, endIndex + 1);

    try {
        return JSON.parse(jsonSubString) as T;
    } catch (error) {
        console.error("Failed to parse JSON substring:", error);
        console.error("Original string:", jsonString);
        console.error("Extracted substring:", jsonSubString);
        throw new Error("The AI returned a response that could not be parsed as JSON.");
    }
}

// --- New NeuroLearn Services ---

const contentLevelSchema = {
    type: Type.OBJECT,
    properties: {
        definition: { type: Type.STRING, description: "A simple definition of the topic." },
        example: { type: Type.STRING, description: "A clear, relatable example, formatted with Markdown." },
        useCase: { type: Type.STRING, description: "A practical use case or real-world application, formatted with Markdown." },
        summary: { type: Type.STRING, description: "A brief summary of this level's explanation." },
        keyTerms: {
            type: Type.ARRAY,
            description: "A list of 2-3 important key terms from the text, each with a simple definition.",
            items: {
                type: Type.OBJECT,
                properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                },
                required: ["term", "definition"]
            }
        },
        media: {
            type: Type.OBJECT,
            description: "Links to relevant external media.",
            properties: {
                webResource: {
                    type: Type.OBJECT,
                    description: "A link to a high-quality, relevant web article or resource.",
                    properties: {
                        title: { type: Type.STRING },
                        link: { type: Type.STRING }
                    },
                    required: ["title", "link"]
                },
                youtubeVideo: {
                    type: Type.OBJECT,
                    description: "A link to a high-quality, relevant YouTube video.",
                    properties: {
                        title: { type: Type.STRING },
                        link: { type: Type.STRING }
                    },
                    required: ["title", "link"]
                }
            },
            required: ["webResource", "youtubeVideo"]
        }
    },
    required: ["definition", "example", "useCase", "summary", "keyTerms", "media"],
};

const simplifiedContentSchema = {
    type: Type.OBJECT,
    properties: {
        suggestedLevel: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advancedSimplified'], description: "The learning level suggested by the AI based on the input's complexity." },
        beginner: { ...contentLevelSchema, description: "Very simple, storytelling tone with real-world examples." },
        intermediate: { ...contentLevelSchema, description: "Balanced explanation using moderate vocabulary." },
        advancedSimplified: { ...contentLevelSchema, description: "Concise, technical but clear summary." },
    },
    required: ["suggestedLevel", "beginner", "intermediate", "advancedSimplified"]
};

type SimplifiedContentSource = string | { mimeType: string; data: string; filename: string };

export async function generateSimplifiedContent(source: SimplifiedContentSource): Promise<SimplifiedContent> {
    let prompt;
    let requestContents;

    const basePrompt = `First, analyze the input content's complexity and determine the most suitable starting learning level for a student ('beginner', 'intermediate', or 'advancedSimplified'). Return this as 'suggestedLevel'. Then, generate a simplified breakdown with three levels: Beginner, Intermediate, and Advanced Simplified. For each level, provide: a definition, an example, a use case, a summary, a list of 2-3 key terms with definitions, one relevant web resource link, and one relevant YouTube video link.`;

    if (typeof source === 'string') {
        prompt = `${basePrompt} Input Text: "${source}"`;
        requestContents = { parts: [{ text: prompt }] };
    } else {
        prompt = `The user has uploaded a media file named "${source.filename}". First, extract the content from this file (e.g., transcribe audio/video, extract text from documents). Based on the extracted content, ${basePrompt.toLowerCase()}`;
         requestContents = { 
            parts: [
                { text: prompt },
                { inlineData: { mimeType: source.mimeType, data: source.data } }
            ]
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: requestContents,
            config: {
                responseMimeType: "application/json",
                responseSchema: simplifiedContentSchema,
            },
        });
        return robustJsonParse<SimplifiedContent>(response.text);
    } catch (error) {
        console.error("Error simplifying content:", error);
        throw new Error("Failed to simplify content. The model may not be able to process this file type or the content may be too complex.");
    }
}

export async function translateContent(content: ContentLevel, targetLanguage: string): Promise<ContentLevel> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Translate the following JSON object's string values into ${targetLanguage}. Preserve the JSON structure and any Markdown formatting within the strings (like lists, bolding, etc.). Do not translate technical terms or proper nouns if there is no direct, common equivalent; keep them in English.
            
            Input JSON:
            ${JSON.stringify(content)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: contentLevelSchema,
            },
        });
        return robustJsonParse<ContentLevel>(response.text);
    } catch (error) {
        console.error(`Error translating content to ${targetLanguage}:`, error);
        throw new Error(`Failed to translate content. The AI service may not support this language or encountered an error.`);
    }
}

const expandedContentSchema = {
    type: Type.OBJECT,
    properties: {
        definitionAndIntroduction: { type: Type.STRING },
        purposeOrImportance: { type: Type.STRING },
        detailedWorkflowOrArchitecture: { type: Type.STRING, description: "A detailed explanation of the workflow or architecture, formatted in Markdown." },
        stepByStepExplanation: { type: Type.STRING, description: "A step-by-step breakdown of the topic, formatted in Markdown." },
        realLifeAndIndustryExamples: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { example: { type: Type.STRING }, explanation: { type: Type.STRING } },
                required: ["example", "explanation"]
            }
        },
        applicationsAndUseCases: { type: Type.ARRAY, items: { type: Type.STRING } },
        merits: { type: Type.ARRAY, items: { type: Type.STRING } },
        demerits: { type: Type.ARRAY, items: { type: Type.STRING } },
        images: {
            type: Type.ARRAY,
            description: "An array of exactly 10 image descriptions. Each should have a prompt for an image generation model, a caption, an explanation, and its relevance.",
            items: {
                type: Type.OBJECT,
                properties: {
                    prompt: { type: Type.STRING, description: "A very descriptive DALL-E style prompt to generate a relevant image." },
                    caption: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    relevance: { type: Type.STRING }
                },
                required: ["prompt", "caption", "explanation", "relevance"]
            }
        },
        youtubeSources: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, link: { type: Type.STRING }, relevance: { type: Type.STRING } },
                required: ["title", "link", "relevance"]
            }
        },
        webSources: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, link: { type: Type.STRING } },
                required: ["title", "link"]
            }
        },
        summaryOrKeyTakeaways: { type: Type.STRING, description: "A concise summary of the key takeaways from the entire explanation." }
    },
    required: ["definitionAndIntroduction", "purposeOrImportance", "detailedWorkflowOrArchitecture", "stepByStepExplanation", "realLifeAndIndustryExamples", "applicationsAndUseCases", "merits", "demerits", "images", "youtubeSources", "webSources", "summaryOrKeyTakeaways"]
};

export async function generateExpandedContent(topic: string, isRefinement: boolean = false): Promise<ExpandedContent> {
    const refinementInstruction = isRefinement ? "This is a second attempt because the user did not understand the first explanation. Please make this version significantly simpler, use more analogies, and ensure the examples are very clear and relatable." : "";
    
    try {
        // Step 1: Generate all textual content and image prompts
        const textResponse = await ai.models.generateContent({
            model: textModel,
            contents: `Act as an expert educator and professor. Create an extremely detailed, professor-level explanation on the following topic: "${topic}". Extract content if the input is a file or link. Generate a comprehensive pack covering all specified parts, including exactly 10 image prompts. The final output must be a single, valid JSON object that strictly adheres to the provided schema. Pay close attention to escaping special characters. Do not add any text or markdown formatting before or after the JSON object. ${refinementInstruction}`,
            config: {
                systemInstruction: NEUROLEARN_SYSTEM_PROMPT,
                responseMimeType: "application/json",
                responseSchema: expandedContentSchema,
            },
        });
        const parsedContent = robustJsonParse<Omit<ExpandedContent, 'images'> & { images: Omit<ImageDetail, 'url'>[] }>(textResponse.text);

        // Step 2: Generate images based on the prompts, with error handling and fallbacks
        const imagePrompts = parsedContent.images.slice(0, 10).map(img => img.prompt);
        const imageGenerationPromises = imagePrompts.map(prompt => 
            ai.models.generateContent({
                model: imageModel,
                contents: { parts: [{ text: prompt }] },
                config: {
                    responseModalities: ['IMAGE'],
                },
            }).then(response => {
                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart && imagePart.inlineData) {
                    const base64ImageBytes: string = imagePart.inlineData.data;
                    const mimeType = imagePart.inlineData.mimeType;
                    return {
                        url: `data:${mimeType};base64,${base64ImageBytes}`,
                        source: 'AI Generated'
                    };
                }
                throw new Error("No image data found in response.");
            }).catch((e) => {
                console.error(`Image generation failed for prompt: "${prompt}"`, e);
                // When primary generation fails (due to quota or other errors), use a fallback.
                console.warn(`Primary image generation failed. Attempting to fetch fallback image for prompt: "${prompt}"`);
                return findHighQualityWebImage(prompt);
            })
        );
        const generatedImageData = await Promise.all(imageGenerationPromises);

        // Step 3: Combine text content with generated image data
        const finalImages: ImageDetail[] = parsedContent.images.slice(0, 10).map((imgData, index) => {
            const imageData = generatedImageData[index];
            return {
                ...imgData,
                url: imageData.url,
                ...(imageData.source && { source: imageData.source }), // Conditionally add source property
            };
        });

        const finalContent: ExpandedContent = {
            ...parsedContent,
            images: finalImages
        };
        
        return finalContent;
    } catch (error) {
        console.error("Error generating expanded content:", error);
        throw new Error("Failed to generate the teaching pack.");
    }
}

const comprehensionTestSchema = {
    type: Type.ARRAY,
    description: "An array of exactly 4 comprehension questions.",
    items: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['multiple-choice', 'short-answer', 'scenario'] },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Provide 4 options if type is 'multiple-choice'." },
            reference: { type: Type.STRING, description: "The section of the content this question tests (e.g., 'Definition', 'Workflow')." }
        },
        required: ["question", "type", "reference"]
    }
};

export async function generateComprehensionTest(topic: string, content: ExpandedContent): Promise<ComprehensionQuestion[]> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Based on the provided teaching pack about "${topic}", generate exactly 4 comprehension questions to test a user's understanding. Include a mix of question types (multiple-choice, short-answer, and an applied scenario). The questions must test the core concepts: definition, workflow, importance, and real-world application. Content: ${JSON.stringify(content)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: comprehensionTestSchema,
            },
        });
        const questions = robustJsonParse<ComprehensionQuestion[]>(response.text);
        if (questions.length !== 4) throw new Error("AI did not generate exactly 4 questions.");
        return questions;
    } catch (error) {
        console.error("Error generating comprehension test:", error);
        throw new Error("Failed to generate the comprehension test.");
    }
}

const testResultSchema = {
    type: Type.OBJECT,
    properties: {
        overallFeedback: { type: Type.STRING, description: "A summary of the user's performance, written in an encouraging tone." },
        understandingLevel: { type: Type.STRING, enum: ['weak', 'moderate', 'strong'] },
        areasToRevisit: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of specific topics from the content that the user should review." }
    },
    required: ["overallFeedback", "understandingLevel", "areasToRevisit"]
};

export async function evaluateComprehensionTest(questions: ComprehensionQuestion[], answers: string[]): Promise<TestResult> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `A user has taken a comprehension test. Evaluate their answers and provide feedback.
            Questions: ${JSON.stringify(questions)}
            User's Answers: ${JSON.stringify(answers)}
            
            Provide an overall feedback summary, assess their understanding level (weak, moderate, or strong), and list specific areas they should revisit based on their incorrect answers.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: testResultSchema,
            },
        });
        return robustJsonParse<TestResult>(response.text);
    } catch (error) {
        console.error("Error evaluating comprehension test:", error);
        throw new Error("Failed to evaluate the test answers.");
    }
}


// --- SparkIQ Services ---

const insightsSchema = {
    type: Type.ARRAY,
    items: { type: Type.STRING }
};

export async function generateAnalyticsInsights(summary: object): Promise<string[]> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `You are an encouraging AI learning coach named Sparky. Based on the following user performance data (JSON format), generate exactly 3 short, actionable, and positive insights. Help the user understand their strengths and suggest what they could try next. Frame the feedback to be motivating and format it as a simple JSON array of strings. Data: ${JSON.stringify(summary, null, 2)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: insightsSchema,
            },
        });
        return robustJsonParse<string[]>(response.text);
    } catch (error) {
        console.error("Error generating analytics insights:", error);
        throw new Error("Failed to generate AI-powered insights.");
    }
}

const thinkBotChallengeSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        task: { type: Type.STRING },
        suggestedTime: { type: Type.INTEGER, description: "Suggested time in minutes" },
    },
    required: ["title", "description", "task", "suggestedTime"]
};

export async function getThinkBotChallenge(category: 'Puzzle' | 'Debate' | 'Try & Analyze', difficulty: Difficulty): Promise<ThinkBotChallenge> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Generate a short, engaging, and creative thinking challenge for a high school student. The category is "${category}" and the difficulty level should be "${difficulty}". Adjust the complexity of the problem, the required depth of thinking, and the subtlety of the task based on the difficulty. An 'Easy' task should be straightforward. A 'Medium' task should require some lateral thinking. A 'Hard' task should be complex, multi-layered, or require deep critical analysis. The challenge should be unique and not something easily found online. The suggested time to complete should be between 5 and 15 minutes.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: thinkBotChallengeSchema,
            },
        });

        const parsed = robustJsonParse<any>(response.text);
        return { ...parsed, category };
    } catch (error) {
        console.error("Error getting SparkIQ challenge:", error);
        throw new Error("Failed to generate a new challenge.");
    }
}

export async function generateCustomThinkBotChallenge(category: 'Jam' | 'Design Task', userPrompt: string): Promise<ThinkBotChallenge> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Generate a short, engaging, and creative thinking challenge for a high school student. The category is "${category}". The challenge should be based on the following user-provided topic or scenario: "${userPrompt}". The challenge should be unique and not something easily found online. The suggested time to complete should be between 5 and 15 minutes.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: thinkBotChallengeSchema,
            },
        });

        const parsed = robustJsonParse<any>(response.text);
        return { ...parsed, category };
    } catch (error) {
        console.error("Error getting custom SparkIQ challenge:", error);
        throw new Error("Failed to generate a custom challenge based on your prompt.");
    }
}

const oddOneOutSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A catchy title for the challenge, like 'Which one doesn't belong?'" },
        task: { type: Type.STRING, description: "A simple instruction, like 'From the list below, identify the item that is the odd one out and be prepared to justify your answer.'" },
        items: {
            type: Type.ARRAY,
            description: "An array of 4 strings. Three items should share a subtle, non-obvious connection, while one is the odd one out.",
            items: { type: Type.STRING }
        },
        suggestedTime: { type: Type.INTEGER, description: "Suggested time in minutes, should be short, like 2-3 minutes." },
    },
    required: ["title", "task", "items", "suggestedTime"]
};

export async function getOddOneOutChallenge(): Promise<ThinkBotChallenge> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Generate an "Odd-One-Out" challenge. Provide 4 items where three are connected in a clever, subtle way, and one is the odd one out. The connection should not be immediately obvious.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: oddOneOutSchema,
            },
        });

        const parsed = robustJsonParse<any>(response.text);
        if (parsed.items?.length !== 4) {
             throw new Error("AI returned incorrect number of items for Odd-One-Out.");
        }
        return { ...parsed, category: 'Odd-One-Out' };

    } catch (error) {
        console.error("Error getting Odd-One-Out challenge:", error);
        throw new Error("Failed to generate an Odd-One-Out challenge.");
    }
}

export async function getImagePuzzleChallenge(): Promise<ThinkBotChallenge> {
    try {
        const conceptResponse = await ai.models.generateContent({
            model: textModel,
            contents: "Generate a concept for a visual puzzle or rebus that can be represented in a single image. The concept should be clever and challenging. Describe the visual elements needed for the image and the puzzle's solution. For example: 'Concept: An image of a knight chess piece made of metal, shining brightly. Solution: 'Heavy metal'.'",
        });
        const concept = conceptResponse.text;

        const imageGenPrompt = `Create an image for a visual puzzle based on this concept: ${concept}. The image should be clear and high-quality, focusing on the key elements described. Do not include any text in the image.`;

        const imageResponse = await ai.models.generateContent({
            model: imageModel,
            contents: { parts: [{ text: imageGenPrompt }] },
            config: {
                responseModalities: ['IMAGE'],
            },
        });

        const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData) {
            throw new Error("Could not extract image data from the AI response for the puzzle.");
        }
        
        const base64ImageBytes: string = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType;
        const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;

        const challenge: ThinkBotChallenge = {
            category: 'Image Puzzle',
            title: "What do you see?",
            description: "Analyze the image carefully. It represents a common phrase, object, or idea in a visual way.",
            task: "Figure out the hidden meaning or phrase in the image.",
            suggestedTime: 5,
            imageUrl: imageUrl
        };
        return challenge;

    } catch (error) {
        console.error("Error getting Image Puzzle challenge:", error);
        throw new Error("Failed to generate an Image Puzzle challenge. The AI service may be temporarily unavailable.");
    }
}

const listeningPracticeSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A title for the short story." },
        story: { type: Type.STRING, description: "A short, interesting story (about 150-200 words) suitable for a listening comprehension test. The story should contain specific details that can be asked about later." },
        questions: {
            type: Type.ARRAY,
            description: "An array of 3 multiple-choice questions about the story.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswerIndex: { type: Type.INTEGER }
                },
                required: ["question", "options", "correctAnswerIndex"]
            }
        },
    },
    required: ["title", "story", "questions"]
};

export async function getListeningPracticeChallenge(): Promise<ThinkBotChallenge> {
     try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: "Create a short story for a listening comprehension exercise. The story should be engaging and around 150-200 words. After the story, create 3 multiple-choice questions to test understanding. Each question must have 4 options, and one must be correct. Indicate the index of the correct answer.",
            config: {
                responseMimeType: "application/json",
                responseSchema: listeningPracticeSchema,
            },
        });

        const parsed = robustJsonParse<any>(response.text);
        return { ...parsed, category: 'Listening Practice', suggestedTime: 0, task: "Listen to the story and answer the questions that follow." };
     } catch (error) {
         console.error("Error getting Listening Practice challenge:", error);
         throw new Error("Failed to generate a Listening Practice challenge.");
     }
}

export async function evaluateSolution(challenge: ThinkBotChallenge, solution: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `A student was given the following challenge:
            - Category: ${challenge.category}
            - Title: ${challenge.title}
            - Task: ${challenge.task}

            The student's solution was:
            "${solution}"

            Act as an encouraging AI Coach. Provide constructive feedback on the student's solution. Keep the feedback concise (2-3 paragraphs). Start with something positive, then offer specific suggestions for improvement. If it's a puzzle-like challenge (like Odd-One-Out or Image Puzzle), first state what the likely correct answer is and why, then evaluate the student's reasoning. Format the output in Markdown.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error evaluating solution:", error);
        throw new Error("Failed to get feedback from the AI coach.");
    }
}

const quizSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.INTEGER, description: "The 0-based index of the correct answer in the options array." }
        },
        required: ["question", "options", "correctAnswerIndex"]
    }
};

export async function generateQuiz(topic: string): Promise<QuizQuestion[]> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Generate a 5-question multiple-choice quiz on the topic of "${topic}". Each question should have 4 options. Indicate the correct answer for each question.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
            },
        });

        const questions = robustJsonParse<QuizQuestion[]>(response.text);
        if (questions.length !== 5 || questions.some(q => q.options.length !== 4)) {
            throw new Error("AI returned quiz in an unexpected format.");
        }
        return questions;
    } catch (error) {
        console.error("Error generating quiz:", error);
        throw new Error("Failed to generate the quiz.");
    }
}

export async function getQuizFeedback(score: number, totalQuestions: number, topic: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `A student scored ${score} out of ${totalQuestions} on a quiz about "${topic}". Provide some brief, encouraging feedback and suggest one related topic they might be interested in exploring next.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting quiz feedback:", error);
        throw new Error("Failed to get quiz feedback.");
    }
}

export async function getListeningPracticeFeedback(score: number, totalQuestions: number, storyTitle: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `A student scored ${score} out of ${totalQuestions} on a listening comprehension quiz for the story titled "${storyTitle}". Provide some brief, encouraging feedback. If they did well, praise their attention to detail. If they struggled, suggest listening again or focusing on key details next time.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting listening practice feedback:", error);
        throw new Error("Failed to get listening practice feedback.");
    }
}