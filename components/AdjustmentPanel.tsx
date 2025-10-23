/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    generateSimplifiedContent,
    generateExpandedContent,
    generateComprehensionTest,
    evaluateComprehensionTest,
    findHighQualityWebImage,
    translateContent,
} from '../services/geminiService';
import {
    SimplifiedContent,
    ExpandedContent,
    ComprehensionQuestion,
    TestResult,
    Activity,
    ContentLevel,
} from '../types';
import Spinner from './Spinner';
// @ts-ignore - using esm.sh import
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import * as mammoth from 'mammoth';
import { FileUploadIcon, VolumeUpIcon } from './icons';

interface NeuroLearnScreenProps {
    onLogActivity: (activity: Omit<Activity, 'timestamp' | 'userId'>) => void;
    onBack: () => void;
}

type ScreenState = 'input' | 'simplified' | 'expanded' | 'test' | 'result';
type SimplifiedTab = 'beginner' | 'intermediate' | 'advancedSimplified';
type SimplifiedContentSource = string | { mimeType: string; data: string; filename: string };


const quotes = [
    { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
    { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
    { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
    { text: "Learning is not attained by chance, it must be sought for with ardor and attended to with diligence.", author: "Abigail Adams" },
    { text: "Creativity is thinking up new things. Innovation is doing new things.", author: "Theodore Levitt" },
    { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
];

const languageMap: { [key: string]: string } = {
    'Hindi': 'hi-IN',
    'Tamil': 'ta-IN',
    'Telugu': 'te-IN',
    'Kannada': 'kn-IN',
    'Bengali': 'bn-IN',
    'Spanish': 'es-ES',
    'French': 'fr-FR',
};

const NeuroLearnScreen: React.FC<NeuroLearnScreenProps> = ({ onLogActivity, onBack }) => {
    const [screenState, setScreenState] = useState<ScreenState>('input');
    const [inputText, setInputText] = useState('');
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Generating content...');
    const [error, setError] = useState<string | null>(null);

    const [simplifiedContent, setSimplifiedContent] = useState<SimplifiedContent | null>(null);
    const [expandedContent, setExpandedContent] = useState<ExpandedContent | null>(null);
    const [comprehensionTest, setComprehensionTest] = useState<ComprehensionQuestion[]>([]);
    const [testAnswers, setTestAnswers] = useState<string[]>([]);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    
    const [activeSimplifiedTab, setActiveSimplifiedTab] = useState<SimplifiedTab>('beginner');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const englishContentRef = useRef<HTMLDivElement>(null);
    const translatedContentRef = useRef<HTMLDivElement>(null);
    const [fileAccept, setFileAccept] = useState('');
    const [sourceFilename, setSourceFilename] = useState<string | null>(null);
    
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);

    // New state for translation and cognitive engine
    const [suggestedLevel, setSuggestedLevel] = useState<SimplifiedTab | null>(null);
    const [targetLanguage, setTargetLanguage] = useState('Hindi');
    const [translatedContent, setTranslatedContent] = useState<ContentLevel | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        // Select a random quote on component mount
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);
    
    // Ensure speech is cancelled on component unmount or state change
    useEffect(() => {
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
            }
        };
    }, [screenState]);

    // Ensure speech is cancelled and translation is cleared if the active simplified tab changes
    useEffect(() => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
        setTranslatedContent(null); // Clear translation when tab changes
    }, [activeSimplifiedTab]);

    // Load speech synthesis voices
    useEffect(() => {
        const loadVoices = () => {
            setVoices(window.speechSynthesis.getVoices());
        };
        // Voices load asynchronously in some browsers.
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        } else {
            loadVoices();
        }
        
        return () => {
            window.speechSynthesis.onvoiceschanged = null; // Cleanup
        };
    }, []);

    const handleUploadClick = (type: 'document' | 'audio') => {
        if (type === 'document') {
            setFileAccept('.pdf,.doc,.docx,.ppt,.pptx,.txt');
        } else {
            setFileAccept('.mp3,.wav,.mp4,.mov,.webm');
        }
        // Use a timeout to ensure state is updated before click
        setTimeout(() => fileInputRef.current?.click(), 0);
    };

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove the data URL prefix (e.g., "data:image/png;base64,")
                resolve(result.split(',')[1]);
            };
            reader.onerror = (error) => reject(error);
        });

    const processSimplifiedContentResult = (content: SimplifiedContent) => {
        setSimplifiedContent(content);
        setSuggestedLevel(content.suggestedLevel);
        setActiveSimplifiedTab(content.suggestedLevel); // Automatically switch to suggested tab
        setTranslatedContent(null); // Reset translation on new content
        setScreenState('simplified');
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setLoadingMessage(`Extracting content from ${file.name}...`);

        try {
            let contentToSimplify: SimplifiedContentSource;
            const mimeType = file.type;
            const fileName = file.name.toLowerCase();

            // Handle DOC/DOCX by extracting text client-side, as Gemini doesn't support this MIME type directly.
            if (mimeType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                // FIX: Check the extracted text before assigning to the union-typed variable to satisfy TypeScript.
                const extractedText = result.value;
                if (!extractedText.trim()) {
                    throw new Error('The Word document appears to be empty or text could not be extracted.');
                }
                contentToSimplify = extractedText;
            }
            // Handle TXT by reading as plain text
            else if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
                contentToSimplify = await file.text();
            }
            // Handle PDF, PPTX, audio, video and other supported file types by sending them directly to the API
            else {
                const base64Data = await fileToBase64(file);
                contentToSimplify = {
                    mimeType: file.type,
                    data: base64Data,
                    filename: file.name,
                };
            }
            
            setLoadingMessage('Simplifying content...');
            setSourceFilename(file.name);
            const content = await generateSimplifiedContent(contentToSimplify);
            processSimplifiedContentResult(content);
            
        } catch (e: any) {
            console.error("File processing failed:", e);
            setError(e.message || "Failed to process the file. Please ensure it's a supported format and not corrupted.");
            setScreenState('input');
        } finally {
            setIsLoading(false);
            if (event.target) {
                event.target.value = '';
            }
        }
    };


    const handleSimplify = async () => {
        if (!inputText.trim()) {
            setError('Please enter some text to simplify.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Simplifying content...');
        setError(null);
        setSourceFilename(null); // No file when simplifying from text area
        
        try {
            const content = await generateSimplifiedContent(inputText);
            processSimplifiedContentResult(content);
        } catch (err: any) {
            setError(err.message || 'Failed to simplify content. There might be an issue with the AI service. Please check your internet connection and try again in a moment.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExpand = async (isRefinement = false) => {
        if (!topic.trim()) {
            setError('Please enter a topic to expand.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Generating your professor-level teaching pack... This may take a minute.');
        setError(null);
        try {
            const content = await generateExpandedContent(topic, isRefinement);
            setExpandedContent(content);
            setScreenState('expanded');
        } catch (err) {
            setError('Failed to expand the topic. The AI service might be busy, or the topic could be too ambiguous. Please try rephrasing or try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateTest = async () => {
        if (!expandedContent || !topic) return;
        setIsLoading(true);
        setLoadingMessage('Generating your test...');
        setError(null);
        try {
            const questions = await generateComprehensionTest(topic, expandedContent);
            setComprehensionTest(questions);
            setTestAnswers(new Array(questions.length).fill(''));
            setScreenState('test');
        } catch (err) {
            setError('Failed to generate the test. This can happen with very complex or niche topics. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitTest = async () => {
        if (testAnswers.some(a => a.trim() === '')) {
            setError("Please answer all questions before submitting.");
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Evaluating your answers...');
        setError(null);
        try {
            const result = await evaluateComprehensionTest(comprehensionTest, testAnswers);
            setTestResult(result);
            setScreenState('result');
            onLogActivity({
                section: 'NeuroLearn',
                outcome: `Test on "${topic}". Level: ${result.understandingLevel}`
            });
        } catch (err) {
            setError('Failed to evaluate your answers. There might be a connection issue. Please try submitting again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAnswerChange = (index: number, answer: string) => {
        const newAnswers = [...testAnswers];
        newAnswers[index] = answer;
        setTestAnswers(newAnswers);
    };
    
    const resetToInput = () => {
        setScreenState('input');
        setInputText('');
        setTopic('');
        setSimplifiedContent(null);
        setExpandedContent(null);
        setComprehensionTest([]);
        setTestResult(null);
        setError(null);
        setSourceFilename(null);
        setSuggestedLevel(null);
        setTranslatedContent(null);
    }
    
    const renderInputScreen = () => (
        <div className="w-full space-y-8">
            {quote && (
                <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-2xl text-sm text-cyan-800 shadow-sm text-center animate-fade-in">
                    <p className="italic">"{quote.text}"</p>
                    <p className="font-semibold mt-2">- {quote.author}</p>
                </div>
            )}
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-pink-200">
                <h3 className="text-2xl font-bold text-pink-600 mb-3">Simplify Text</h3>
                <p className="text-gray-600 mb-4">Paste complex text, or upload a document/audio file to get a simplified explanation.</p>
                <textarea
                    rows={6}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste your text here or upload a file below..."
                    className="w-full p-3 border border-pink-200 bg-gray-50 rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                />
                
                <div className="mt-4 flex flex-col md:flex-row gap-4 items-center">
                    {/* Upload buttons group */}
                    <div className="w-full md:w-auto flex-1">
                        <div className="flex gap-2">
                            <button type="button" onClick={() => handleUploadClick('document')} className="w-full flex items-center justify-center gap-2 bg-white text-pink-500 font-semibold py-2 px-4 border border-pink-300 rounded-xl hover:bg-pink-50 transition">
                                <FileUploadIcon className="w-5 h-5" />
                                Document
                            </button>
                            <button type="button" onClick={() => handleUploadClick('audio')} className="w-full flex items-center justify-center gap-2 bg-white text-pink-500 font-semibold py-2 px-4 border border-pink-300 rounded-xl hover:bg-pink-50 transition">
                                <VolumeUpIcon className="w-5 h-5" />
                                Audio/Video
                            </button>
                        </div>
                        <p className="text-xs text-center text-gray-500 mt-2">.pdf, .docx, .pptx, .txt, .mp3, .wav, .mp4</p>
                    </div>

                    {/* Simplify button */}
                    <button onClick={handleSimplify} disabled={isLoading || !inputText.trim()} className="w-full md:w-auto md:flex-1 bg-pink-500 text-white font-bold py-3 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg disabled:bg-pink-300 hover-sparkle">
                        {isLoading ? 'Simplifying...' : 'Simplify'}
                    </button>
                </div>

                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={fileAccept}
                    className="hidden"
                />
            </div>
            
            <div className="text-center text-gray-500 font-semibold">OR</div>

            <div className="bg-white p-6 rounded-3xl shadow-lg border border-pink-200">
                <h3 className="text-2xl font-bold text-pink-600 mb-3">Expand a Topic</h3>
                <p className="text-gray-600 mb-4">Enter a topic to get a comprehensive, professor-level teaching pack with images, examples, and sources.</p>
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., 'Photosynthesis' or 'The Industrial Revolution' or a YouTube link"
                    className="w-full p-3 border border-pink-200 bg-gray-50 rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                />
                <button onClick={() => handleExpand(false)} disabled={isLoading || !topic.trim()} className="mt-4 w-full bg-pink-500 text-white font-bold py-3 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg disabled:bg-pink-300 hover-sparkle">
                     {isLoading ? 'Expanding...' : 'Expand Topic'}
                </button>
            </div>
        </div>
    );

    const handleSpeak = useCallback((contentRef: React.RefObject<HTMLDivElement>, lang?: string) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            // If the user clicks the same button again, it just stops.
            // If they click a different button, it will stop and then start the new one below.
            return;
        }

        if (!contentRef.current) return;
        
        const textToSpeak = contentRef.current.innerText;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        let targetVoice: SpeechSynthesisVoice | undefined;

        if (lang) {
            // Try to find a voice that matches the language code exactly or the language part.
            targetVoice = voices.find(voice => voice.lang === lang) || voices.find(voice => voice.lang.startsWith(lang.split('-')[0]));
        } else {
             // Default to a female English voice if no language is specified.
            targetVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')) ||
                          voices.find(voice => voice.lang.startsWith('en') && (voice.name.includes('Google') || voice.name.includes('Samantha') || voice.name.includes('Zira'))) ||
                          voices.find(voice => voice.lang.startsWith('en'));
        }

        if (targetVoice) {
            utterance.voice = targetVoice;
        }
        
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            if (e.error !== 'interrupted') {
                console.error("Speech synthesis error:", e.error);
            }
            setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    }, [isSpeaking, voices]);
    
    const handleTranslate = async () => {
        if (!simplifiedContent) return;
        const activeContent = simplifiedContent[activeSimplifiedTab];
        if (!activeContent) return;

        setIsTranslating(true);
        setError(null);
        try {
            const translation = await translateContent(activeContent, targetLanguage);
            setTranslatedContent(translation);
        } catch (err: any) {
            setError(err.message || 'Translation failed.');
        } finally {
            setIsTranslating(false);
        }
    };

    const renderSimplifiedContent = () => {
        if (!simplifiedContent) return null;

        const tabs: { id: SimplifiedTab; label: string; emoji: string; content: ContentLevel }[] = [
            { id: 'beginner', label: 'Beginner', emoji: '🟢', content: simplifiedContent.beginner },
            { id: 'intermediate', label: 'Intermediate', emoji: '🟠', content: simplifiedContent.intermediate },
            { id: 'advancedSimplified', label: 'Advanced', emoji: '🔵', content: simplifiedContent.advancedSimplified },
        ];

        const activeTabContent = tabs.find(tab => tab.id === activeSimplifiedTab)?.content;

        const renderContentLevel = (content: ContentLevel) => (
            <div className="space-y-4">
                <div>
                    <h3 className="!text-xl !font-bold !text-pink-600">Definition</h3>
                    <ReactMarkdown>{content.definition}</ReactMarkdown>
                </div>
                <div>
                    <h3 className="!text-xl !font-bold !text-pink-600">Example</h3>
                    <ReactMarkdown>{content.example}</ReactMarkdown>
                </div>
                <div>
                    <h3 className="!text-xl !font-bold !text-pink-600">Use Case</h3>
                    <ReactMarkdown>{content.useCase}</ReactMarkdown>
                </div>
                <div>
                    <h3 className="!text-xl !font-bold !text-pink-600">Summary</h3>
                    <ReactMarkdown>{content.summary}</ReactMarkdown>
                </div>
                <div>
                    <h4 className="!text-lg !font-bold !text-pink-600 !mt-6">Key Terms</h4>
                    <ul className="!list-disc !pl-5">
                        {content.keyTerms.map((item, index) => (
                            <li key={index} className="!my-1">
                                <mark className="bg-pink-100 text-pink-800 px-1 rounded">{item.term}:</mark> {item.definition}
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="!text-lg !font-bold !text-pink-600 !mt-6">Related Media</h4>
                    <ul className="!list-disc !pl-5">
                        {sourceFilename && (
                            <li className="!my-1">
                                📄 Source File: <span className="italic text-gray-600">{sourceFilename}</span>
                            </li>
                        )}
                        <li className="!my-1">
                            🌐 Web: <a href={content.media.webResource.link} target="_blank" rel="noopener noreferrer" className="!text-blue-600 hover:!underline">{content.media.webResource.title}</a>
                        </li>
                        <li className="!my-1">
                            📺 YouTube: <a href={content.media.youtubeVideo.link} target="_blank" rel="noopener noreferrer" className="!text-blue-600 hover:!underline">{content.media.youtubeVideo.title}</a>
                        </li>
                    </ul>
                </div>
            </div>
        );

        return (
            <div className="w-full">
                <h2 className="text-3xl font-bold text-pink-600 mb-4">Simplify Text (3 Levels)</h2>
                 {suggestedLevel && (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-sm text-yellow-800 mb-4 shadow-sm animate-fade-in">
                        <p>✨ Based on the content's complexity, we suggest starting with the <strong>{suggestedLevel.replace('Simplified', ' Simplified')}</strong> level.</p>
                    </div>
                )}
                <div className="border-b border-pink-200 mb-4">
                    <nav className="-mb-px flex space-x-6">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSimplifiedTab(tab.id)}
                                className={`${
                                    activeSimplifiedTab === tab.id
                                        ? 'border-pink-500 text-pink-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
                            >
                                {tab.emoji} {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-inner border border-pink-200 min-h-[300px] prose max-w-none">
                    {activeTabContent && (
                        <div className={translatedContent ? "grid md:grid-cols-2 gap-x-8" : ""}>
                            <div ref={englishContentRef}>
                                {translatedContent && <h3 className="!text-xl !font-bold !text-gray-600 text-center !mt-0 !mb-4 pb-2 border-b">English</h3>}
                                {renderContentLevel(activeTabContent)}
                            </div>
                            {translatedContent && (
                                <div ref={translatedContentRef} className="border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-8 mt-4 md:mt-0">
                                    <h3 className="!text-xl !font-bold !text-gray-600 text-center !mt-0 !mb-4 pb-2 border-b">{targetLanguage}</h3>
                                    {renderContentLevel(translatedContent)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onClick={resetToInput} className="bg-pink-500 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg hover-sparkle">
                        Start Over
                    </button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                         {/* Translation Controls */}
                        <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="bg-white border border-pink-300 rounded-lg py-2 px-3 text-pink-700 font-semibold focus:ring-2 focus:ring-pink-400 focus:outline-none"
                        >
                            {Object.keys(languageMap).map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                        <button onClick={handleTranslate} disabled={isTranslating} className="bg-pink-100 text-pink-700 font-bold py-2 px-4 rounded-xl transition hover:bg-pink-200 disabled:bg-pink-50 disabled:text-pink-400">
                            {isTranslating ? 'Translating...' : 'Translate'}
                        </button>
                        {/* Speech Controls */}
                         <button onClick={() => handleSpeak(englishContentRef)} className="bg-pink-100 text-pink-700 font-bold py-2 px-4 rounded-xl transition hover:bg-pink-200 flex-shrink-0">
                            {isSpeaking ? '⏹️ Stop' : '🔊 Read English'}
                        </button>
                        {translatedContent && (
                            <button onClick={() => handleSpeak(translatedContentRef, languageMap[targetLanguage])} className="bg-pink-100 text-pink-700 font-bold py-2 px-4 rounded-xl transition hover:bg-pink-200 flex-shrink-0">
                                {isSpeaking ? '⏹️ Stop' : `🔊 Read ${targetLanguage}`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    const handleToggleSpeech = useCallback(() => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            if (!expandedContent) return;
            const textToSpeak = [
                `Title: ${topic}`,
                `Definition and Introduction. ${expandedContent.definitionAndIntroduction}`,
                `Purpose or Importance. ${expandedContent.purposeOrImportance}`,
                `Detailed Workflow or Architecture. ${expandedContent.detailedWorkflowOrArchitecture}`,
                `Step by step Explanation. ${expandedContent.stepByStepExplanation}`,
                `Merits. ${expandedContent.merits.join('. ')}`,
                `Demerits. ${expandedContent.demerits.join('. ')}`,
                `Summary. ${expandedContent.summaryOrKeyTakeaways}`,
            ].join('\n\n');

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            const femaleVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')) ||
                                voices.find(voice => voice.lang.startsWith('en') && (voice.name.includes('Google') || voice.name.includes('Samantha') || voice.name.includes('Zira'))) ||
                                voices.find(voice => voice.lang.startsWith('en'));

            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }
            
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = (e) => {
                // The 'interrupted' error is expected when we manually cancel speech (e.g., by clicking the button again).
                // We don't need to log this as a critical error.
                if (e.error !== 'interrupted') {
                    console.error("Speech synthesis error:", e.error);
                }
                setIsSpeaking(false);
            };

            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    }, [isSpeaking, expandedContent, topic, voices]);

    const handleDownload = () => {
        if (!expandedContent || !topic) return;
        const textContent = [
            `Topic: ${topic}\n\n`,
            `## Definition & Introduction\n${expandedContent.definitionAndIntroduction}\n\n`,
            `## Purpose / Importance\n${expandedContent.purposeOrImportance}\n\n`,
            `## Detailed Workflow or Architecture\n${expandedContent.detailedWorkflowOrArchitecture}\n\n`,
            `## Step-by-step Explanation\n${expandedContent.stepByStepExplanation}\n\n`,
            `## Real-life and industry Examples\n${expandedContent.realLifeAndIndustryExamples.map(e => `- ${e.example}: ${e.explanation}`).join('\n')}\n\n`,
            `## Applications & Use Cases\n${expandedContent.applicationsAndUseCases.map(a => `- ${a}`).join('\n')}\n\n`,
            `## Merits\n${expandedContent.merits.map(m => `- ${m}`).join('\n')}\n\n`,
            `## Demerits\n${expandedContent.demerits.map(d => `- ${d}`).join('\n')}\n\n`,
            `## Summary / Key Takeaways\n${expandedContent.summaryOrKeyTakeaways}`
        ].join('');

        const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${topic.replace(/\s+/g, '_')}_notes.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleSaveToLibrary = () => {
        alert('This feature will be available in a future update!');
        console.log('"Save to Library" clicked. This feature is pending implementation.');
    };
    
    const handleRetryImage = useCallback(async (index: number) => {
        if (!expandedContent) return;
    
        const imageToRetry = expandedContent.images[index];
        // Indicate loading state for this specific image if desired
        // For example, by setting its URL to a spinner GIF
    
        try {
            const newImageData = await findHighQualityWebImage(imageToRetry.prompt);
            
            setExpandedContent(prev => {
                if (!prev) return null;
                const newImages = [...prev.images];
                newImages[index] = {
                    ...newImages[index], // Keep original caption, explanation, etc.
                    url: newImageData.url,
                    source: newImageData.source,
                };
                return { ...prev, images: newImages };
            });
        } catch (error) {
            console.error("Failed to retry fetching image:", error);
            alert("Sorry, we couldn't find a better image right now. Please try again later.");
        }
    }, [expandedContent]);

    const renderExpandedContent = () => {
        if (!expandedContent) return null;
        
        return (
            <div className="w-full">
                <h2 className="text-4xl font-bold text-pink-600 mb-6 text-center">Teaching Pack: <span className="text-pink-500">{topic}</span></h2>
                
                 <div className="bg-white p-8 rounded-3xl shadow-inner border border-pink-200 max-h-[65vh] overflow-y-auto prose max-w-none">
                    <section>
                        <h3 className="!text-2xl !font-bold !text-pink-600">Definition & Introduction</h3>
                        <ReactMarkdown>{expandedContent.definitionAndIntroduction}</ReactMarkdown>
                    </section>
                    <section>
                        <h3 className="!text-2xl !font-bold !text-pink-600">Purpose / Importance</h3>
                        <ReactMarkdown>{expandedContent.purposeOrImportance}</ReactMarkdown>
                    </section>
                    <section>
                        <h3 className="!text-2xl !font-bold !text-gray-800">Detailed Workflow or Architecture</h3>
                        <ReactMarkdown>{expandedContent.detailedWorkflowOrArchitecture}</ReactMarkdown>
                    </section>
                    <section>
                        <h3 className="!text-2xl !font-bold !text-gray-800">Step-by-step Explanation</h3>
                        <ReactMarkdown>{expandedContent.stepByStepExplanation}</ReactMarkdown>
                    </section>
                    <section>
                        <h3 className="!text-2xl !font-bold !text-gray-800">Real-life and Industry Examples</h3>
                        {expandedContent.realLifeAndIndustryExamples.map((ex, i) => <div key={i} className="mb-2"><h4>{ex.example}</h4><p>{ex.explanation}</p></div>)}
                    </section>
                     <section>
                        <h3 className="!text-2xl !font-bold !text-gray-800">Applications & Use Cases</h3>
                        <ul>{expandedContent.applicationsAndUseCases.map((app, i) => <li key={i}>{app}</li>)}</ul>
                    </section>
                    <section>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="!text-2xl !font-bold !text-pink-600">Merits</h3>
                                <ul>{expandedContent.merits.map((m, i) => <li key={i}>{m}</li>)}</ul>
                            </div>
                            <div>
                                <h3 className="!text-2xl !font-bold !text-pink-600">Demerits</h3>
                                <ul>{expandedContent.demerits.map((d, i) => <li key={i}>{d}</li>)}</ul>
                            </div>
                        </div>
                    </section>
                     <section>
                        <h3 className="!text-2xl !font-bold !text-gray-800">Images</h3>
                        <div className="space-y-6">
                             {expandedContent.images.map((img, i) => (
                                 <div key={i} className="border p-4 rounded-lg bg-gray-50 not-prose">
                                     {img.source && img.source.startsWith('Placeholder') ? (
                                        <div className="w-full h-72 rounded-md mb-2 bg-gray-200 flex flex-col justify-center items-center text-center p-4 border border-dashed border-gray-400">
                                            <p className="font-semibold text-red-600">Could not find a suitable image.</p>
                                            <p className="text-sm text-gray-500 mb-4">The automatic web search failed. Please try again.</p>
                                            <button 
                                                onClick={() => handleRetryImage(i)}
                                                className="bg-pink-500 text-white font-bold py-2 px-4 rounded-xl transition hover:bg-pink-600"
                                            >
                                                Retry Search
                                            </button>
                                        </div>
                                     ) : (
                                        <img src={img.url} alt={img.caption} className="w-full h-72 object-cover rounded-md mb-2 shadow-lg"/>
                                     )}
                                     <p className="font-bold text-gray-800">{img.caption}</p>
                                     <p className="text-sm text-gray-600 mt-1"><strong className="text-gray-700">Explanation:</strong> {img.explanation}</p>
                                     <p className="text-sm text-gray-600 mt-1"><strong className="text-gray-700">Relevance:</strong> {img.relevance}</p>
                                     {img.source && !img.source.startsWith('Placeholder') && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Image Source: 
                                            {img.source === 'Unsplash' ? 
                                                <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-pink-500"> Unsplash</a> :
                                                ` ${img.source}`
                                            }
                                        </p>
                                    )}
                                 </div>
                             ))}
                        </div>
                    </section>
                    <section>
                        <h3 className="!text-2xl !font-bold !text-gray-800">Supported Media</h3>
                        <h4>YouTube Sources</h4>
                        <ul>{expandedContent.youtubeSources.map((s, i) => <li key={i}><a href={s.link} target="_blank" rel="noopener noreferrer">{s.title}</a> - {s.relevance}</li>)}</ul>
                        <h4>Web Sources</h4>
                        <ul>{expandedContent.webSources.map((s, i) => <li key={i}><a href={s.link} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul>
                    </section>
                     <section>
                        <h3 className="!text-2xl !font-bold !text-gray-800">Summary / Key Takeaways</h3>
                        <ReactMarkdown>{expandedContent.summaryOrKeyTakeaways}</ReactMarkdown>
                    </section>
                    <div className="mt-6 text-center not-prose">
                        <p className="text-gray-600 mb-2">Would you like me to read this aloud?</p>
                        <button onClick={handleToggleSpeech} className="bg-pink-100 text-pink-700 font-bold py-2 px-6 rounded-xl transition hover:bg-pink-200">
                           {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
                        </button>
                    </div>
                 </div>
                 
                 <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button onClick={handleDownload} className="w-full sm:w-auto bg-white text-pink-600 font-bold py-2 px-6 rounded-xl border-2 border-pink-500 transition hover:bg-pink-50">Download as Notes</button>
                    <button onClick={handleSaveToLibrary} className="w-full sm:w-auto bg-white text-pink-600 font-bold py-2 px-6 rounded-xl border-2 border-pink-500 transition hover:bg-pink-50">Save in Library</button>
                    <button onClick={handleGenerateTest} disabled={isLoading} className="w-full sm:w-auto bg-pink-500 text-white font-bold py-3 px-10 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg disabled:bg-pink-300 hover-sparkle">
                        {isLoading ? 'Generating...' : 'Test My Understanding'}
                    </button>
                 </div>
            </div>
        );
    };

    const renderTestScreen = () => (
        <div className="w-full">
            <h2 className="text-3xl font-bold text-pink-600 mb-4">Comprehension Test: {topic}</h2>
            <div className="space-y-6">
                {comprehensionTest.map((q, index) => (
                    <div key={index} className="bg-white p-6 rounded-3xl shadow-lg border border-pink-200">
                        <p className="font-semibold text-gray-500 text-sm mb-1">Question {index + 1} of {comprehensionTest.length} (Tests: {q.reference})</p>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">{q.question}</h3>
                        {q.type === 'multiple-choice' ? (
                            <div className="space-y-2">
                                {q.options?.map((option, optIndex) => (
                                    <label key={optIndex} className="flex items-center p-2 rounded-md hover:bg-pink-50 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`question-${index}`}
                                            value={option}
                                            checked={testAnswers[index] === option}
                                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                                            className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                                        />
                                        <span className="ml-3 text-gray-700">{option}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                rows={3}
                                value={testAnswers[index]}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                placeholder="Type your answer here..."
                                className="w-full p-2 border border-pink-200 bg-gray-50 rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                            />
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-8 text-center">
                <button onClick={handleSubmitTest} disabled={isLoading} className="bg-pink-500 text-white font-bold py-3 px-10 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg disabled:bg-pink-300 hover-sparkle">
                    {isLoading ? 'Evaluating...' : 'Submit Answers'}
                </button>
            </div>
        </div>
    );
    
    const renderResultScreen = () => {
        if (!testResult) return null;
        
        const levelColor = {
            'strong': 'text-green-500 bg-green-100',
            'moderate': 'text-yellow-500 bg-yellow-100',
            'weak': 'text-red-500 bg-red-100',
        };

        return (
            <div className="w-full">
                <h2 className="text-3xl font-bold text-pink-600 mb-4">Test Results: {topic}</h2>
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-pink-200 space-y-4">
                    <div className="text-center">
                        <p className="text-gray-600 text-lg">Your understanding level is:</p>
                        <p className={`text-3xl font-bold capitalize px-4 py-2 rounded-full inline-block mt-2 ${levelColor[testResult.understandingLevel]}`}>
                            {testResult.understandingLevel}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Feedback</h3>
                        <p className="text-gray-700">{testResult.overallFeedback}</p>
                    </div>
                    {testResult.areasToRevisit.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Areas to Revisit</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                {testResult.areasToRevisit.map((area, i) => <li key={i}>{area}</li>)}
                            </ul>
                            <div className="mt-4">
                                <button onClick={() => handleExpand(true)} className="text-pink-600 font-semibold hover:underline">
                                    I don't understand, please re-explain the topic.
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                 <div className="mt-8 text-center">
                    <button onClick={resetToInput} className="bg-pink-500 text-white font-bold py-3 px-10 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg hover-sparkle">
                        Learn Something New
                    </button>
                </div>
            </div>
        );
    }
    
    const renderContent = () => {
        if (isLoading) {
             return (
                <div className="text-center">
                    <Spinner color="pink" />
                    <p className="mt-4 text-gray-600 text-lg">{loadingMessage}</p>
                </div>
             );
        }
        
        if (error) {
            return (
                <div className="text-center text-red-500 bg-red-50 p-4 rounded-lg">
                    <p className="font-bold">An error occurred:</p>
                    <p>{error}</p>
                    <button onClick={resetToInput} className="mt-2 text-pink-600 font-semibold">Try again</button>
                </div>
            );
        }

        switch (screenState) {
            case 'input': return renderInputScreen();
            case 'simplified': return renderSimplifiedContent();
            case 'expanded': return renderExpandedContent();
            case 'test': return renderTestScreen();
            case 'result': return renderResultScreen();
            default: return renderInputScreen();
        }
    };
    
    return (
        <div className="w-full max-w-4xl animate-fade-in self-start mt-24">
            <button onClick={onBack} className="flex items-center text-gray-200 font-semibold hover:text-white mb-4 transition-colors opacity-80 hover:opacity-100">
                &larr; Back
            </button>
            <div className="text-center mb-6">
                 <h1 className="text-4xl font-bold text-pink-500 drop-shadow-md mb-2">NeuroLearn</h1>
                 <p className="text-gray-100 font-medium drop-shadow-sm">AI for Inclusive Classroom Learning</p>
             </div>
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl w-full flex justify-center items-center min-h-[500px] border border-white/20">
                {renderContent()}
            </div>
        </div>
    );
};

export default NeuroLearnScreen;