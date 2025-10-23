/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface StartScreenProps {
  onSelectNeuroLearn: () => void;
  onSelectSparkIQ: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectNeuroLearn, onSelectSparkIQ }) => {
  return (
    <div className="text-center animate-fade-in flex flex-col items-center">
      <h1 className="text-7xl font-extrabold tracking-tight mb-4 text-white drop-shadow-lg" >
        tuRNext AI
      </h1>
      <p className="max-w-2xl text-xl text-gray-100 font-medium mb-12 drop-shadow-md">
        Your AI partner for inclusive learning and creative thinking.
      </p>
      <div className="flex flex-col md:flex-row gap-8">
        <div 
          onClick={onSelectNeuroLearn}
          className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl hover:shadow-pink-400/50 transition-all duration-300 cursor-pointer border-2 border-white/20 hover:border-pink-400 hover:-translate-y-2 w-80"
        >
          <h2 className="text-3xl font-bold text-pink-500 mb-2">NeuroLearn</h2>
          <p className="text-gray-500">AI for Inclusive Classroom Learning. Simplify and translate content in real-time.</p>
        </div>
        <div 
          onClick={onSelectSparkIQ}
          className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl hover:shadow-pink-400/50 transition-all duration-300 cursor-pointer border-2 border-white/20 hover:border-pink-400 hover:-translate-y-2 w-80"
        >
          <h2 className="text-3xl font-bold text-pink-500 mb-2">SparkIQ</h2>
          <p className="text-gray-500">Your AI Critical Thinking & Creativity Coach. Solve challenges and grow your skills.</p>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;