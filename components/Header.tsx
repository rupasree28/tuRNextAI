/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { UserIcon, LogoutIcon, ChartIcon } from './icons';
import { User } from '../types';

interface HeaderProps {
    currentUser: User;
    onHome: () => void;
    onProfile: () => void;
    onActivities: () => void;
    onDashboard: () => void;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onHome, onProfile, onActivities, onDashboard, onLogout }) => {
  return (
    <header className="absolute top-0 left-0 right-0 bg-white/70 backdrop-blur-sm shadow-md p-3 z-10">
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <button onClick={onHome} className="text-xl font-bold text-pink-500 hover:text-pink-600 transition">
          Home
        </button>
        <div className="flex items-center gap-6">
            <button onClick={onProfile} className="text-gray-600 hover:text-pink-500 font-semibold transition flex items-center gap-2">
                {currentUser.picture ? (
                    <img src={currentUser.picture} alt="Profile" className="w-8 h-8 rounded-full" />
                ) : (
                    <UserIcon className="w-6 h-6" />
                )}
                Profile
            </button>
             <button onClick={onActivities} className="text-gray-600 hover:text-pink-500 font-semibold transition">
                Recent Activities
            </button>
             <button onClick={onDashboard} className="text-gray-600 hover:text-pink-500 font-semibold transition flex items-center gap-2">
                <ChartIcon className="w-6 h-6" />
                Dashboard
            </button>
             <button onClick={onLogout} className="text-gray-600 hover:text-red-500 transition flex items-center gap-2" title="Logout">
                <LogoutIcon className="w-6 h-6" />
            </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;