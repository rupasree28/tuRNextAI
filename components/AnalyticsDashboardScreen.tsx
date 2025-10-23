/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useMemo } from 'react';
import { Activity } from '../types';
import { generateAnalyticsInsights } from '../services/geminiService';
import Spinner from './Spinner';
import { ChartIcon, LightbulbIcon } from './icons';

// @ts-ignore
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
// @ts-ignore
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface AnalyticsDashboardScreenProps {
    activities: Activity[];
    onBack: () => void;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
    <div className="bg-white p-4 rounded-2xl shadow-md flex items-center gap-4 border border-pink-100">
        <div className="bg-pink-100 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const AnalyticsDashboardScreen: React.FC<AnalyticsDashboardScreenProps> = ({ activities, onBack }) => {
    const [insights, setInsights] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const stats = useMemo(() => {
        const neuroLearnActivities = activities.filter(a => a.section === 'NeuroLearn');
        const sparkIQActivities = activities.filter(a => a.section.startsWith('SparkIQ'));

        // Process quiz scores
        const quizScores = activities
            .filter(a => a.section.includes('Quiz'))
            .map(a => {
                const match = a.outcome.match(/(\d+)\/(\d+)/);
                return match ? parseInt(match[1]) / parseInt(match[2]) : null;
            })
            .filter((s): s is number => s !== null);
        
        const avgQuizScore = quizScores.length > 0 ? Math.round((quizScores.reduce((a, b) => a + b, 0) / quizScores.length) * 100) : 0;

        // Process cognitive skills from SparkIQ
        const cognitiveSkills: { [key: string]: number } = {
            'Problem-Solving': 0, // Puzzle
            'Creativity': 0,      // Design Task, Jam
            'Argumentation': 0,   // Debate
            'Analysis': 0,        // Try & Analyze, Odd-One-Out
            'Knowledge': 0,       // Quiz
            'Comprehension': 0,   // Listening Practice
        };

        let mostFrequentCategory = 'N/A';
        const categoryCounts: { [key: string]: number } = {};

        sparkIQActivities.forEach(a => {
            const category = a.section.split(': ')[1];
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;

            if (category === 'Puzzle') cognitiveSkills['Problem-Solving']++;
            else if (category === 'Design Task' || category === 'Jam') cognitiveSkills['Creativity']++;
            else if (category === 'Debate') cognitiveSkills['Argumentation']++;
            else if (category === 'Try & Analyze' || category === 'Odd-One-Out') cognitiveSkills['Analysis']++;
            else if (category === 'Quiz') cognitiveSkills['Knowledge']++;
            else if (category === 'Listening Practice') cognitiveSkills['Comprehension']++;
        });

        if (Object.keys(categoryCounts).length > 0) {
            mostFrequentCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
        }

        return {
            totalActivities: activities.length,
            mostFrequentCategory,
            avgQuizScore,
            cognitiveSkills,
        };
    }, [activities]);

    useEffect(() => {
        if (activities.length === 0) {
            setIsLoading(false);
            return;
        }

        const fetchInsights = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Create a simplified summary for the AI
                const summaryForAI = {
                    totalActivities: stats.totalActivities,
                    mostFrequentCategory: stats.mostFrequentCategory,
                    averageQuizScorePercentage: stats.avgQuizScore,
                    cognitiveSkillPracticeCounts: stats.cognitiveSkills,
                };
                const result = await generateAnalyticsInsights(summaryForAI);
                setInsights(result);
            } catch (err) {
                setError("Could not load AI-powered insights. Please try again later.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsights();
    }, [activities, stats]);

    const radarChartData = {
        labels: Object.keys(stats.cognitiveSkills),
        datasets: [
            {
                label: '# of Challenges Completed',
                data: Object.values(stats.cognitiveSkills),
                backgroundColor: 'rgba(236, 72, 153, 0.2)',
                borderColor: 'rgba(236, 72, 153, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(236, 72, 153, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(236, 72, 153, 1)',
            },
        ],
    };
    
    const radarOptions = {
        scales: {
            r: {
                angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                pointLabels: { font: { size: 12, weight: 'bold' }, color: '#4b5563' },
                ticks: { backdropColor: 'white', stepSize: 1 },
                suggestedMin: 0,
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
        maintainAspectRatio: false,
    };

    return (
        <div className="w-full max-w-4xl animate-fade-in self-start mt-24">
            <button onClick={onBack} className="flex items-center text-gray-200 font-semibold hover:text-white mb-4 transition-colors opacity-80 hover:opacity-100">
                &larr; Back
            </button>
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl w-full border border-white/20">
                <h1 className="text-4xl font-bold text-pink-500 mb-6">Your Learning Dashboard</h1>
                
                {activities.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No activity data yet. Complete some challenges in NeuroLearn or SparkIQ to see your dashboard!</p>
                ) : (
                    <div className="space-y-6">
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard title="Total Activities" value={stats.totalActivities} icon={<ChartIcon className="w-6 h-6 text-pink-500"/>} />
                            <StatCard title="Favorite Activity" value={stats.mostFrequentCategory} icon={<ChartIcon className="w-6 h-6 text-pink-500"/>} />
                            <StatCard title="Avg. Quiz Score" value={`${stats.avgQuizScore}%`} icon={<ChartIcon className="w-6 h-6 text-pink-500"/>} />
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cognitive Skills Radar Chart */}
                            <div className="bg-white p-4 rounded-2xl shadow-md border border-pink-100">
                                <h2 className="text-xl font-bold text-gray-700 mb-2">Cognitive Skills Practice</h2>
                                <div className="h-80">
                                    <Radar data={radarChartData} options={radarOptions} />
                                </div>
                            </div>

                            {/* AI Insights */}
                            <div className="bg-white p-4 rounded-2xl shadow-md border border-pink-100">
                                <h2 className="text-xl font-bold text-gray-700 mb-2">AI Coach's Insights</h2>
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Spinner color="pink"/>
                                    </div>
                                ) : error ? (
                                     <p className="text-red-500">{error}</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {insights.map((insight, index) => (
                                            <li key={index} className="flex items-start gap-3 bg-pink-50 p-3 rounded-lg">
                                                <LightbulbIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-gray-600 text-sm">{insight}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsDashboardScreen;
