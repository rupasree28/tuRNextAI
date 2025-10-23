/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400 z-50 animate-fade-out" style={{ animationDelay: '1.5s' }}>
      <style>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #f9a8d4, 0 0 40px #f9a8d4; }
          50% { text-shadow: 0 0 20px #fff, 0 0 30px #f9a8d4, 0 0 40px #f9a8d4, 0 0 50px #f9a8d4; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; visibility: hidden; }
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        .animate-fade-out {
            animation: fadeOut 0.5s ease-in-out forwards;
        }
      `}</style>
      <h1 className="text-8xl font-extrabold text-white animate-glow tracking-tight">
        tuRNext AI
      </h1>
    </div>
  );
};

export default SplashScreen;
