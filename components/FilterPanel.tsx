/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
// FIX: Moved type imports from geminiService to types file.
import { 
    getThinkBotChallenge, 
    evaluateSolution, 
    generateQuiz, 
    getQuizFeedback, 
    getImagePuzzleChallenge,
    getOddOneOutChallenge,
    getListeningPracticeChallenge,
    getListeningPracticeFeedback,
    generateCustomThinkBotChallenge
} from '../services/geminiService';
import Spinner from './Spinner';
// @ts-ignore - using esm.sh import
import ReactMarkdown from 'react-markdown';
import { MicrophoneIcon, PlayIcon, PauseIcon, VolumeUpIcon } from './icons';
import { Activity, ThinkBotChallenge, ChallengeCategory, Quiz, QuizQuestion, Difficulty } from '../types';


declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

type ScreenState = 'selection' | 'quiz_topic_input' | 'custom_prompt_input' | 'difficulty_selection' | 'challenge' | 'feedback';
type ListeningPracticeState = 'ready' | 'playing' | 'paused' | 'answering';

interface SparkIQScreenProps {
    // FIX: Updated the type to Omit 'userId' as it's handled by the parent component.
    onLogActivity: (activity: Omit<Activity, 'timestamp' | 'userId'>) => void;
    onBack: () => void;
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const challengeDurations: Partial<Record<ChallengeCategory, number>> = {
    'Puzzle': 300,             // 5 min
    'Debate': 300,             // 5 min
    'Try & Analyze': 300,      // 5 min
    'Design Task': 600,        // 10 min
    'Jam': 60,                 // 1 min
    'Image Puzzle': 300,       // 5 min
    'Odd-One-Out': 60,         // 1 min
};

const SparkIQScreen: React.FC<SparkIQScreenProps> = ({ onLogActivity, onBack }) => {
    const [screenState, setScreenState] = useState<ScreenState>('selection');
    const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | null>(null);
    const [currentChallenge, setCurrentChallenge] = useState<ThinkBotChallenge | null>(null);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
    const [quizTopic, setQuizTopic] = useState('');
    const [customPrompt, setCustomPrompt] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('Medium');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
    const [quizScore, setQuizScore] = useState<number | null>(null);
    const [userSolution, setUserSolution] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');

    // New states for new challenges
    const [selectedOddOneOutIndex, setSelectedOddOneOutIndex] = useState<number | null>(null);
    const [listeningPracticeState, setListeningPracticeState] = useState<ListeningPracticeState>('ready');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [hasStoryPlayedOnce, setHasStoryPlayedOnce] = useState(false);

    const speechRecognition = useRef<any>(null);
    const utterance = useRef<SpeechSynthesisUtterance | null>(null);

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

    // Speech Recognition setup
    useEffect(() => {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            speechRecognition.current = new SpeechRecognition();
            const recognition = speechRecognition.current;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let finalTranscript = '';
            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setTranscript(finalTranscript + interimTranscript);
                setUserSolution(finalTranscript + interimTranscript);
            };
            return () => recognition.stop();
        }
    }, []);

    // Cleanup for speech synthesis on unmount or challenge change
    useEffect(() => {
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, [currentChallenge]);
    
    // FIX: Defined the missing handleStopJam function to be called by the timer useEffect.
    const handleStopJam = useCallback(() => {
        if (speechRecognition.current && isRecording) {
            speechRecognition.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    const handleSubmitSolution = useCallback(async (isAutoSubmit = false) => {
        if (!currentChallenge) return;
        if (!isAutoSubmit && !userSolution.trim()) return;
        setIsLoading(true);
        setError(null);
        setScreenState('feedback');
        try {
            const result = await evaluateSolution(currentChallenge, userSolution);
            setFeedback(result);
            // FIX: Added the missing 'outcome' property to the onLogActivity call to match the required type.
            onLogActivity({
                section: `SparkIQ: ${currentChallenge.category}`,
                outcome: `Completed: ${currentChallenge.title}`
            });
        } catch (err) {
            setError('Failed to get feedback. Please try submitting again.');
            setScreenState('challenge');
        } finally {
            setIsLoading(false);
        }
    }, [currentChallenge, userSolution, onLogActivity]);
    
    const handleSubmitQuiz = useCallback(async () => {
        if (!currentQuiz) return;
        let score = 0;
        currentQuiz.questions.forEach((q, index) => {
            if (q.correctAnswerIndex === userAnswers[index]) {
                score++;
            }
        });
        setQuizScore(score);
        setIsLoading(true);
        setError(null);
        setScreenState('feedback');
        try {
            const result = await getQuizFeedback(score, currentQuiz.questions.length, currentQuiz.topic);
            setFeedback(result);
            onLogActivity({
                section: 'SparkIQ: Quiz',
                outcome: `Score: ${score}/${currentQuiz.questions.length} on "${currentQuiz.topic}"`,
            });
        } catch (err) {
            setError('Failed to get feedback for the quiz.');
            setFeedback(`You scored ${score} out of ${currentQuiz.questions.length}.`);
        } finally {
            setIsLoading(false);
        }
    }, [currentQuiz, userAnswers, onLogActivity]);
    
    const handleSubmitListeningQuiz = useCallback(async () => {
        if (!currentChallenge?.questions) return;
        let score = 0;
        currentChallenge.questions.forEach((q, index) => {
            const question = q as QuizQuestion;
            if (question.correctAnswerIndex === userAnswers[index]) {
                score++;
            }
        });

        setIsLoading(true);
        setError(null);
        setScreenState('feedback');
        try {
            const result = await getListeningPracticeFeedback(score, currentChallenge.questions.length, currentChallenge.title);
            setFeedback(result);
            onLogActivity({
                section: 'SparkIQ: Listening Practice',
                outcome: `Score: ${score}/${currentChallenge.questions.length} on "${currentChallenge.title}"`,
            });
        } catch (err) {
            setError('Failed to get feedback for the listening practice.');
            setFeedback(`You scored ${score} out of ${currentChallenge.questions.length}.`);
        } finally {
            setIsLoading(false);
        }
    }, [currentChallenge, userAnswers, onLogActivity]);
    
    const handleAutoSubmit = useCallback(() => {
        if (currentQuiz) {
            handleSubmitQuiz();
        } else if (currentChallenge?.category === 'Listening Practice') {
            handleSubmitListeningQuiz();
        } else if (currentChallenge) {
            if (currentChallenge.category === 'Jam' && isRecording) {
                handleStopJam();
            }
            // Use a timeout to allow the final transcript from 'Jam' to be set, as stop is async
            setTimeout(() => handleSubmitSolution(true), currentChallenge.category === 'Jam' ? 100 : 0);
        }
    }, [currentChallenge, currentQuiz, isRecording, handleStopJam, handleSubmitQuiz, handleSubmitListeningQuiz, handleSubmitSolution]);
    
    // Effect for running the timer down
    useEffect(() => {
        // Explicitly exclude Listening Practice from the countdown timer.
        if (screenState !== 'challenge' || timer <= 0 || currentChallenge?.category === 'Listening Practice') {
            return;
        }

        // Special condition for 'Jam': timer only runs while recording
        if (currentChallenge?.category === 'Jam' && !isRecording) {
            return;
        }

        const interval = setInterval(() => {
            setTimer((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [screenState, timer, currentChallenge, isRecording]);

    // Effect for when timer runs out
    useEffect(() => {
        // Explicitly exclude Listening Practice from all auto-submit and time-up logic.
        if (currentChallenge?.category === 'Listening Practice') {
            return;
        }
        
        if (timer <= 0 && screenState === 'challenge' && (currentChallenge || currentQuiz) && !isTimeUp) {
            setIsTimeUp(true);
            
            // Only auto-submit and alert if a timer was actually set for the challenge.
            // This prevents auto-submission for challenges that start with timer=0.
            const hadTimer = (currentQuiz || (currentChallenge && challengeDurations[currentChallenge.category]));
            if (hadTimer) {
                alert("Time is up! Your work has been auto-submitted.");
                handleAutoSubmit();
            }
        }
    }, [timer, screenState, currentChallenge, currentQuiz, isTimeUp, handleAutoSubmit]);

    const handleSelectCategory = useCallback(async (category: ChallengeCategory) => {
        setIsLoading(true);
        setError(null);
        setSelectedCategory(category);
        setCurrentChallenge(null);
        setUserSolution('');
        setFeedback('');

        if (['Puzzle', 'Debate', 'Try & Analyze'].includes(category)) {
            setSelectedDifficulty('Medium'); // Reset to default
            setScreenState('difficulty_selection');
            setIsLoading(false);
            return;
        }
        
        if (category === 'Jam' || category === 'Design Task') {
            setScreenState('custom_prompt_input');
            setCustomPrompt('');
            setIsLoading(false);
            return;
        }

        if (category === 'Quiz') {
            setScreenState('quiz_topic_input');
            setIsLoading(false);
            return;
        }

        setScreenState('challenge');
        try {
            let challenge: ThinkBotChallenge;
            if (category === 'Image Puzzle') {
                challenge = await getImagePuzzleChallenge();
            } else if (category === 'Odd-One-Out') {
                challenge = await getOddOneOutChallenge();
                setSelectedOddOneOutIndex(null);
            } else if (category === 'Listening Practice') {
                challenge = await getListeningPracticeChallenge();
                setListeningPracticeState('ready');
                setUserAnswers(new Array(challenge.questions!.length).fill(null));
                setCurrentQuestionIndex(0);
                setHasStoryPlayedOnce(false);
            } else {
                throw new Error("Invalid category");
            }
            setCurrentChallenge(challenge);
            const duration = challengeDurations[challenge.category];
            setTimer(duration ?? 0);
            setIsTimeUp(false);
            if (challenge.category === 'Jam') setTranscript('');

        } catch (err) {
            setError('Failed to load a new challenge. The AI service might be temporarily unavailable. Please try selecting a category again in a moment.');
            setScreenState('selection');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleStartChallengeWithDifficulty = useCallback(async () => {
        if (!selectedCategory) return;
        
        setIsLoading(true);
        setError(null);
        setScreenState('challenge');

        try {
            const challenge = await getThinkBotChallenge(
                selectedCategory as 'Puzzle' | 'Debate' | 'Try & Analyze', 
                selectedDifficulty
            );
            setCurrentChallenge(challenge);
            const duration = challengeDurations[challenge.category];
            setTimer(duration ?? 0);
            setIsTimeUp(false);
        } catch (err) {
            setError('Failed to load a new challenge. The AI service might be temporarily unavailable. Please try again in a moment.');
            setScreenState('selection');
        } finally {
            setIsLoading(false);
        }
    }, [selectedCategory, selectedDifficulty]);

    const handleStartQuiz = useCallback(async () => {
        if (!quizTopic.trim()) {
            setError('Please enter a topic for the quiz.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const questions = await generateQuiz(quizTopic);
            setCurrentQuiz({ topic: quizTopic, questions });
            setUserAnswers(new Array(questions.length).fill(null));
            setCurrentQuestionIndex(0);
            setQuizScore(null);
            setTimer(questions.length * 60); // 1 minute per question
            setIsTimeUp(false);
            setScreenState('challenge');
        } catch (err) {
            setError('Failed to generate the quiz. The topic may be too niche or the AI service is busy. Please try a different topic or try again in a few moments.');
        } finally {
            setIsLoading(false);
        }
    }, [quizTopic]);

    const handleGenerateCustomChallenge = useCallback(async () => {
        if (!customPrompt.trim() || !selectedCategory) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const challenge = await generateCustomThinkBotChallenge(selectedCategory as 'Jam' | 'Design Task', customPrompt);
            setCurrentChallenge(challenge);
            const duration = challengeDurations[challenge.category];
            setTimer(duration ?? 0);
            setIsTimeUp(false);
            if (challenge.category === 'Jam') setTranscript('');
            setScreenState('challenge');
        } catch (err: any) {
            setError(err.message || 'Failed to generate your custom challenge. Please try a different prompt or try again later.');
        } finally {
            setIsLoading(false);
        }
    }, [customPrompt, selectedCategory]);

    const handleQuizAnswer = (optionIndex: number) => {
        if (isTimeUp) return;
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const handleNextQuestion = () => {
        if (currentQuiz && currentQuestionIndex < currentQuiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const resetState = () => {
        setScreenState('selection');
        setSelectedCategory(null);
        setCurrentChallenge(null);
        setCurrentQuiz(null);
        setError(null);
        setIsLoading(false);
        setTimer(0);
        setIsTimeUp(false);
    };

    const renderSelectionScreen = () => {
        const categories: { name: ChallengeCategory; style: string }[] = [
            { name: 'Puzzle', style: 'bg-pink-500 hover:bg-pink-600' },
            { name: 'Debate', style: 'bg-pink-500 hover:bg-pink-600' },
            { name: 'Design Task', style: 'bg-pink-500 hover:bg-pink-600' },
            { name: 'Jam', style: 'bg-teal-500 hover:bg-teal-600' },
            { name: 'Try & Analyze', style: 'bg-cyan-500 hover:bg-cyan-600' },
            { name: 'Quiz', style: 'bg-lime-500 hover:bg-lime-600' },
            { name: 'Image Puzzle', style: 'bg-rose-500 hover:bg-rose-600' },
            { name: 'Odd-One-Out', style: 'bg-indigo-500 hover:bg-indigo-600' },
            { name: 'Listening Practice', style: 'bg-orange-500 hover:bg-orange-600' },
        ];

        return (
            <div className="w-full">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-pink-600 mb-2">Choose a Challenge Category</h2>
                    <p className="text-gray-500">Select a category to test your skills.</p>
                </div>
                <div className="grid grid-cols-3 gap-5">
                    {categories.map(({ name, style }) => (
                        <button 
                            key={name} 
                            onClick={() => handleSelectCategory(name)} 
                            className={`py-6 rounded-2xl shadow-lg hover:shadow-xl text-white font-bold text-lg hover:-translate-y-1.5 transition-all duration-300 ${style}`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderQuizTopicInputScreen = () => (
        <div className="w-full text-center">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">Quiz Time!</h2>
            <p className="text-gray-600 mb-4">What topic would you like to be quizzed on?</p>
            <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder="e.g., 'Roman History' or 'Quantum Physics'"
                className="w-full p-3 border border-pink-200 bg-gray-50 rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:outline-none transition mb-4"
            />
            <button onClick={handleStartQuiz} disabled={isLoading || !quizTopic.trim()} className="w-full bg-pink-500 text-white font-bold py-3 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 disabled:bg-pink-300">
                {isLoading ? 'Generating...' : 'Start Quiz'}
            </button>
        </div>
    );
    
    const renderDifficultySelectionScreen = () => (
        <div className="w-full text-center">
            <h2 className="text-2xl font-bold text-pink-600 mb-2">Select Difficulty for {selectedCategory}</h2>
            <p className="text-gray-600 mb-6">Choose how tough you want the challenge to be.</p>
            <div className="flex justify-center gap-4 mb-8">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(level => (
                    <button
                        key={level}
                        onClick={() => setSelectedDifficulty(level)}
                        className={`px-8 py-3 rounded-xl font-bold text-lg border-2 transition ${selectedDifficulty === level ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-700 border-gray-300 hover:border-pink-400'}`}
                    >
                        {level}
                    </button>
                ))}
            </div>
            <button 
                onClick={handleStartChallengeWithDifficulty} 
                disabled={isLoading} 
                className="w-full bg-pink-500 text-white font-bold py-3 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 disabled:bg-pink-300"
            >
                {isLoading ? 'Generating...' : 'Generate Challenge'}
            </button>
        </div>
    );

    const renderCustomPromptInputScreen = () => (
        <div className="w-full text-center">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">Create a Custom {selectedCategory} Challenge!</h2>
            <p className="text-gray-600 mb-4">Describe the topic or scenario you'd like to base the challenge on.</p>
            <textarea
                rows={4}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={selectedCategory === 'Jam' 
                    ? "e.g., 'Improvise a speech from the perspective of a cat who has just been elected president.'" 
                    : "e.g., 'Design a backpack for astronauts on Mars.'"}
                className="w-full p-3 border border-pink-200 bg-gray-50 rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:outline-none transition mb-4"
            />
            <button onClick={handleGenerateCustomChallenge} disabled={isLoading || !customPrompt.trim()} className="w-full bg-pink-500 text-white font-bold py-3 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 disabled:bg-pink-300">
                {isLoading ? 'Generating...' : 'Generate Challenge'}
            </button>
        </div>
    );
    
    const handleOddOneOutSelect = (index: number, item: string) => {
        if (isTimeUp) return;
        setSelectedOddOneOutIndex(index);
        // Pre-fill the solution with a default phrase the user can edit
        setUserSolution(`I think "${item}" is the odd one out because...`);
    };

    const handleToggleListen = () => {
        if (!currentChallenge?.story) return;

        if (listeningPracticeState === 'playing' && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            setListeningPracticeState('paused');
            return;
        }

        if (listeningPracticeState === 'paused' && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setListeningPracticeState('playing');
            return;
        }

        // For 'ready' or 'answering' (replay), start a new utterance
        window.speechSynthesis.cancel(); // Stop any previous speech

        utterance.current = new SpeechSynthesisUtterance(currentChallenge.story);
        
        // Find a suitable female voice, preferring Indian English
        let targetVoice = voices.find(v => v.lang === 'en-IN' && v.name.toLowerCase().includes('female'));
        if (!targetVoice) targetVoice = voices.find(v => v.lang === 'en-IN');
        if (!targetVoice) targetVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
        if (!targetVoice) targetVoice = voices.find(v => v.lang.startsWith('en'));

        if (targetVoice) {
            utterance.current.voice = targetVoice;
        }

        utterance.current.rate = 0.9;   // Slower rate
        utterance.current.pitch = 1.1;  // Slightly higher pitch

        utterance.current.onend = () => {
            if (!hasStoryPlayedOnce) {
                setCurrentQuestionIndex(0);
                setHasStoryPlayedOnce(true);
            }
            setListeningPracticeState('answering');
        };
        
        utterance.current.onerror = (e) => {
            if (e.error !== 'interrupted') {
                console.error("Speech synthesis error:", e.error);
            }
        };

        window.speechSynthesis.speak(utterance.current);
        setListeningPracticeState('playing');
    };

    const handleListeningAnswer = (optionIndex: number) => {
        if (isTimeUp) return;
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setUserAnswers(newAnswers);

        // Automatically move to the next question
        if (currentChallenge && currentQuestionIndex < currentChallenge.questions!.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    const handleStartJam = () => {
        if (speechRecognition.current && !isTimeUp) {
            setTranscript('');
            setUserSolution('');
            speechRecognition.current.start();
            setIsRecording(true);
        }
    };

    const renderChallengeScreen = () => {
        const hasTimer = currentChallenge?.category !== 'Listening Practice' && (currentQuiz || (currentChallenge && challengeDurations[currentChallenge.category]));

        const renderTimer = () => (
            <div className={`text-lg font-bold p-2 px-4 rounded-lg transition-colors ${timer < 60 && timer > 0 ? 'text-red-600 bg-red-100 animate-pulse' : 'text-gray-600 bg-gray-100'}`}>
                <span>{formatTime(timer)}</span>
            </div>
        );

        if (currentQuiz) {
            const question = currentQuiz.questions[currentQuestionIndex];
            return (
                 <div className="w-full">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-2xl font-bold text-pink-600 mb-2">Quiz: {currentQuiz.topic}</h2>
                            <p className="font-semibold text-gray-500 mb-4">Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}</p>
                        </div>
                        {hasTimer && renderTimer()}
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-inner border border-pink-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">{question.question}</h3>
                        <div className="space-y-3">
                            {question.options.map((option, index) => (
                                <button key={index} onClick={() => handleQuizAnswer(index)} disabled={isTimeUp} className={`w-full text-left p-3 rounded-lg border-2 transition ${userAnswers[currentQuestionIndex] === index ? 'bg-pink-100 border-pink-500' : 'bg-gray-50 border-gray-200 hover:bg-pink-50'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div className="mt-6 flex justify-between items-center">
                        <span></span>
                        {currentQuestionIndex < currentQuiz.questions.length - 1 ? (
                            <button onClick={handleNextQuestion} disabled={userAnswers[currentQuestionIndex] === null || isTimeUp} className="bg-pink-500 text-white font-bold py-2 px-6 rounded-xl shadow-md hover:bg-pink-600 disabled:bg-pink-300">Next</button>
                        ) : (
                            <button onClick={handleSubmitQuiz} disabled={userAnswers[currentQuestionIndex] === null || isTimeUp} className="bg-green-500 text-white font-bold py-2 px-6 rounded-xl shadow-md hover:bg-green-600 disabled:bg-green-300">Submit Quiz</button>
                        )}
                    </div>
                 </div>
            );
        }

        if (!currentChallenge) return null;

        const submitButton = (
             <button
                onClick={() => handleSubmitSolution(false)}
                disabled={isLoading || !userSolution.trim() || isTimeUp}
                className="bg-pink-500 text-white font-bold py-3 px-10 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 disabled:bg-pink-300"
            >
                {isLoading ? 'Evaluating...' : 'Submit Solution'}
            </button>
        );

        switch (currentChallenge.category) {
            case 'Image Puzzle':
                return (
                    <div className="w-full text-center">
                        <div className="flex justify-between items-start mb-2">
                             <h2 className="text-2xl font-bold text-pink-600 mb-2">{currentChallenge.title}</h2>
                             {hasTimer && renderTimer()}
                        </div>
                        <p className="text-gray-600 mb-4">{currentChallenge.description}</p>
                        <img src={currentChallenge.imageUrl} alt="Challenge Puzzle" className="rounded-lg mx-auto mb-4 shadow-lg max-h-72"/>
                        <textarea
                            rows={2}
                            value={userSolution}
                            onChange={(e) => setUserSolution(e.target.value)}
                            placeholder="What do you think it is?"
                            disabled={isTimeUp}
                            className="w-full p-2 border border-pink-200 bg-gray-50 rounded-xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:outline-none transition disabled:opacity-50"
                        />
                        <div className="mt-6">{submitButton}</div>
                    </div>
                );

            case 'Odd-One-Out':
                return (
                    <div className="w-full">
                        <div className="flex justify-between items-start mb-2">
                             <h2 className="text-2xl font-bold text-pink-600 mb-2">{currentChallenge.title}</h2>
                             {hasTimer && renderTimer()}
                        </div>
                        <p className="text-gray-600 mb-4">{currentChallenge.task}</p>
                        <div className="grid grid-cols-2 gap-4 my-4">
                            {currentChallenge.items?.map((item, index) => (
                                <button key={index} onClick={() => handleOddOneOutSelect(index, item)} disabled={isTimeUp} className={`p-4 rounded-lg border-2 text-lg transition ${selectedOddOneOutIndex === index ? 'bg-pink-100 border-pink-500' : 'bg-gray-50 border-gray-200 hover:bg-pink-50'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    {item}
                                </button>
                            ))}
                        </div>
                        <textarea
                            rows={3}
                            value={userSolution}
                            onChange={(e) => setUserSolution(e.target.value)}
                            placeholder="Explain your reasoning here..."
                            disabled={isTimeUp}
                            className="w-full p-2 border border-pink-200 bg-gray-50 rounded-xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:outline-none transition disabled:opacity-50"
                        />
                        <div className="mt-6 text-center">{submitButton}</div>
                    </div>
                );

            case 'Listening Practice':
                const question = currentChallenge.questions?.[currentQuestionIndex] as QuizQuestion;
                return (
                    <div className="w-full text-center">
                         <div className="flex justify-between items-start mb-2">
                             <h2 className="text-2xl font-bold text-pink-600 mb-2">{currentChallenge.title}</h2>
                        </div>
                        <p className="text-gray-600 mb-4">{currentChallenge.task}</p>

                        {listeningPracticeState === 'ready' && (
                            <button onClick={handleToggleListen} className="bg-pink-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:bg-pink-600 transition flex items-center gap-3 mx-auto text-xl disabled:bg-pink-300">
                                <PlayIcon className="w-8 h-8"/> Start Listening
                            </button>
                        )}
                        
                        {(listeningPracticeState === 'playing' || listeningPracticeState === 'paused') && (
                            <div>
                                <p className="text-gray-500 italic mb-4">Listening to the story...</p>
                                <button onClick={handleToggleListen} className="bg-white text-pink-500 font-bold p-4 rounded-full shadow-lg border-2 border-pink-200 hover:bg-pink-50 transition flex items-center gap-3 mx-auto text-xl disabled:opacity-50">
                                    {listeningPracticeState === 'playing' ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                                    {listeningPracticeState === 'playing' ? 'Pause' : 'Resume'}
                                </button>
                            </div>
                        )}

                        {listeningPracticeState === 'answering' && question && (
                            <div className="text-left animate-fade-in">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="font-semibold text-gray-500">Question {currentQuestionIndex + 1} of {currentChallenge.questions!.length}</p>
                                    <button onClick={handleToggleListen} className="flex items-center gap-2 text-sm font-semibold text-pink-600 hover:underline">
                                        <VolumeUpIcon className="w-5 h-5" />
                                        Replay Story
                                    </button>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">{question.question}</h3>
                                <div className="space-y-3">
                                    {question.options.map((option, index) => (
                                        <button key={index} onClick={() => handleListeningAnswer(index)} className={`w-full text-left p-3 rounded-lg border-2 transition ${userAnswers[currentQuestionIndex] === index ? 'bg-pink-100 border-pink-500' : 'bg-gray-50 border-gray-200 hover:bg-pink-50'}`}>
                                            {option}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-6 flex justify-between items-center">
                                    <span></span>
                                    {currentQuestionIndex < currentChallenge.questions!.length - 1 ? (
                                        <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} disabled={userAnswers[currentQuestionIndex] === null} className="bg-pink-500 text-white font-bold py-2 px-6 rounded-xl shadow-md hover:bg-pink-600 disabled:bg-pink-300">Next</button>
                                    ) : (
                                        <button onClick={handleSubmitListeningQuiz} disabled={userAnswers.some(a => a === null)} className="bg-green-500 text-white font-bold py-2 px-6 rounded-xl shadow-md hover:bg-green-600 disabled:bg-green-300">Submit Answers</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'Jam':
                return (
                    <div className="w-full text-center">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-pink-600">{currentChallenge.title}</h2>
                            {hasTimer && renderTimer()}
                        </div>
                        <p className="text-gray-600 mb-6">{currentChallenge.task}</p>
                        
                        {!isRecording ? (
                            <button onClick={handleStartJam} disabled={isTimeUp} className="bg-red-500 text-white rounded-full p-6 shadow-lg hover:bg-red-600 transition animate-pulse disabled:bg-red-300 disabled:animate-none">
                                <MicrophoneIcon className="w-10 h-10" />
                            </button>
                        ) : (
                            <button onClick={handleStopJam} className="bg-gray-400 text-white rounded-full p-6 shadow-lg hover:bg-gray-500 transition">
                                <div className="w-10 h-10 bg-red-500 rounded-md"></div>
                            </button>
                        )}
                        
                        <p className="text-sm text-gray-500 mt-4">{isRecording ? "Recording... Click the square to stop." : "Click the mic to start your jam session!"}</p>
                        
                        <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg min-h-[100px] border">
                            <p className="text-gray-700">{transcript || "Your transcribed speech will appear here."}</p>
                        </div>

                        <div className="mt-6">
                            <button onClick={() => handleSubmitSolution(false)} disabled={isLoading || !userSolution.trim() || isRecording || isTimeUp} className="bg-pink-500 text-white font-bold py-3 px-10 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 disabled:bg-pink-300">
                                Submit for Feedback
                            </button>
                        </div>
                    </div>
                );

            default: // For Puzzle, Debate, Design Task, Try & Analyze
                return (
                    <div className="w-full">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-2xl font-bold text-pink-600">{currentChallenge.title}</h2>
                            {hasTimer && renderTimer()}
                        </div>
                        <p className="text-gray-600 mb-4">{currentChallenge.description}</p>
                        <div className="bg-white p-6 rounded-2xl shadow-inner border border-pink-200 space-y-4">
                            <p className="font-semibold text-gray-800">{currentChallenge.task}</p>
                            <textarea
                                rows={8}
                                value={userSolution}
                                onChange={(e) => setUserSolution(e.target.value)}
                                placeholder="Type your solution here..."
                                className="w-full p-2 border border-pink-200 bg-gray-50 rounded-xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:outline-none transition disabled:opacity-50"
                                disabled={isTimeUp}
                            />
                            {isTimeUp && <p className="text-red-500 font-semibold text-center">Time's up! Please submit your solution.</p>}
                        </div>
                        <div className="mt-6 text-center">{submitButton}</div>
                    </div>
                );
        }
    };

    const renderFeedbackScreen = () => (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">Feedback</h2>
            <div className="bg-white p-6 rounded-2xl shadow-inner border border-pink-200 prose max-w-none">
                <ReactMarkdown>{feedback}</ReactMarkdown>
            </div>
            <div className="mt-6 text-center">
                <button onClick={resetState} className="bg-pink-500 text-white font-bold py-3 px-10 text-lg rounded-xl shadow-md hover:bg-pink-600">
                    Try Another Challenge
                </button>
            </div>
        </div>
    );


    const renderContent = () => {
        if (isLoading) {
             return (
                <div className="text-center">
                    <Spinner color="pink" />
                    <p className="mt-4 text-gray-600 text-lg">Loading your challenge...</p>
                </div>
             );
        }
        
        if (error) {
            return (
                <div className="text-center text-red-500 bg-red-50 p-4 rounded-lg">
                    <p className="font-bold">An error occurred:</p>
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="mt-2 text-pink-600 font-semibold">Try again</button>
                </div>
            );
        }

        switch (screenState) {
            case 'selection': return renderSelectionScreen();
            case 'quiz_topic_input': return renderQuizTopicInputScreen();
            case 'custom_prompt_input': return renderCustomPromptInputScreen();
            case 'difficulty_selection': return renderDifficultySelectionScreen();
            case 'challenge': return renderChallengeScreen();
            case 'feedback': return renderFeedbackScreen();
            default: return renderSelectionScreen();
        }
    };
    
    return (
        <div className="w-full max-w-4xl animate-fade-in self-start mt-24">
             <button onClick={onBack} className="flex items-center text-gray-200 font-semibold hover:text-white mb-4 transition-colors opacity-80 hover:opacity-100">
                &larr; Back to Home
            </button>
             <div className="text-center mb-8">
                 <h1 className="text-5xl font-bold text-white drop-shadow-md mb-2">SparkIQ</h1>
                 <p className="text-xl text-white font-medium drop-shadow-sm">Your AI Critical Thinking & Creativity Coach</p>
             </div>
            <div className="bg-white/95 backdrop-blur-sm p-10 rounded-[2rem] shadow-2xl w-full flex justify-center items-center min-h-[500px] border border-white/20">
                {renderContent()}
            </div>
        </div>
    );
};

export default SparkIQScreen;