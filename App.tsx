import React, { useState, useCallback, useEffect } from 'react';
import NeuroLearnScreen from './components/AdjustmentPanel';
import SparkIQScreen from './components/FilterPanel';
import StartScreen from './components/StartScreen';
import SplashScreen from './components/SplashScreen';
import AuthScreen from './components/AuthScreen';
import ProfileScreen from './components/ProfileScreen';
import RecentActivitiesScreen from './components/RecentActivitiesScreen';
import AnalyticsDashboardScreen from './components/AnalyticsDashboardScreen';
import Header from './components/Header';
import { Activity, User } from './types';

// FIX: Moved mock data from the bottom of the file and made it local to resolve compiler errors.
const mockUsers: User[] = [
    { id: 'user_1', username: 'student', email: 'student@example.com', password: 'hashed_password123', bio: 'Loves learning new things!'},
    { id: 'user_2', username: 'Alex', email: 'alex@gmail.com', password: 'hashed_alex123!'},
    { id: 'user_3', username: 'janedoe', name: 'Jane Doe', email: 'jane.doe@example.com', googleId: 'google_12345', bio: 'Creative thinker and problem solver.', picture: 'https://lh3.googleusercontent.com/a/ACg8ocJ_6Zg_p_1_3_q_-_...'},
];

const mockActivities: Activity[] = [
    { userId: 'user_3', section: 'SparkIQ: Quiz', outcome: 'Score: 4/5 on "Roman History"', timestamp: new Date(Date.now() - 86400000 * 2) },
    { userId: 'user_3', section: 'NeuroLearn', outcome: 'Test on "Photosynthesis...". Level: strong', timestamp: new Date(Date.now() - 86400000) },
    { userId: 'user_3', section: 'SparkIQ: Puzzle', outcome: 'Completed: The River Crossing Riddle', timestamp: new Date(Date.now() - 86400000 * 3) },
    { userId: 'user_3', section: 'SparkIQ: Design Task', outcome: 'Completed: Martian Backpack', timestamp: new Date(Date.now() - 86400000 * 4) },
];

type Screen = 'start' | 'neurolearn' | 'sparkiq' | 'profile' | 'activities' | 'dashboard';

// FIX: Changed to a named export to resolve a module resolution error.
export const App: React.FC = () => {
    const [showSplash, setShowSplash] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [screenHistory, setScreenHistory] = useState<Screen[]>(['start']);
    
    // --- Mock Database ---
    const [users, setUsers] = useState<User[]>(mockUsers);
    const [activities, setActivities] = useState<Activity[]>([]);

    const currentScreen = screenHistory[screenHistory.length - 1];

    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    // Load user from localStorage on initial render
    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user: User = JSON.parse(storedUser);
                // Optional: Validate if user still exists in our 'database'
                if (users.some(dbUser => dbUser.id === user.id)) {
                    setCurrentUser(user);
                } else {
                    // User in localStorage doesn't exist in our DB, so clear it.
                    localStorage.removeItem('currentUser');
                }
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
                localStorage.removeItem('currentUser');
            }
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    // Persist user to localStorage whenever it changes
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('currentUser');
        }
    }, [currentUser]);
    
    // Load user-specific activities from localStorage when the user changes
    useEffect(() => {
        if (currentUser) {
            const storedActivities = localStorage.getItem(`activities_${currentUser.id}`);
            if (storedActivities) {
                try {
                    // Parse activities and convert timestamp strings back to Date objects
                    const parsedActivities = JSON.parse(storedActivities).map((a: Activity) => ({
                        ...a,
                        timestamp: new Date(a.timestamp)
                    }));
                    setActivities(parsedActivities);
                } catch (e) {
                    console.error("Failed to parse activities from localStorage", e);
                    setActivities([]); // Reset to empty if parsing fails
                }
            } else {
                // If no stored activities, check if it's the mock user to pre-populate for demo purposes
                if (currentUser.id === 'user_3') {
                    setActivities(mockActivities);
                } else {
                    setActivities([]); // Start new users with an empty list
                }
            }
        } else {
            // No user is logged in, so clear activities from the state
            setActivities([]);
        }
    }, [currentUser]);

    // Persist activities to localStorage whenever they change for the current user
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`activities_${currentUser.id}`, JSON.stringify(activities));
        }
    }, [activities, currentUser]);

    const navigateTo = (screen: Screen) => {
        setScreenHistory(prev => [...prev, screen]);
    };

    const navigateBack = () => {
        if (screenHistory.length > 1) {
            setScreenHistory(prev => prev.slice(0, -1));
        }
    };

    const handleRegister = (user: Omit<User, 'id'>): { success: boolean, message?: string } => {
        if (users.some(u => u.username === user.username)) {
            return { success: false, message: 'Username is already taken.' };
        }
        // Only check email for non-Google registrations, as Google validates it
        if (!user.googleId && users.some(u => u.email === user.email)) {
            return { success: false, message: 'Email is already registered.' };
        }
        const newUser: User = { ...user, id: `user_${Date.now()}` };
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser);
        return { success: true };
    };

    const handleLogin = (credentials: {username?: string, password?: string, googleId?: string}): { success: boolean, message?: string } => {
        let foundUser: User | undefined;
        if (credentials.googleId) {
             foundUser = users.find(u => u.googleId === credentials.googleId);
             if (!foundUser) return { success: false, message: 'This Google account is not registered. Please register first.' };
        } else {
            foundUser = users.find(u => u.username === credentials.username);
            if (!foundUser || !foundUser.password || foundUser.password !== `hashed_${credentials.password}`) {
                return { success: false, message: 'Invalid username or password. Please double-check your credentials and try again.' };
            }
        }
        setCurrentUser(foundUser);
        setScreenHistory(['start']);
        return { success: true };
    };
    
    const handleGoogleSignIn = (googleData: { googleId: string; email: string; name: string; picture?: string; }): { success: boolean; needsRegistration?: boolean; message?: string; authData?: { googleId: string; email: string; name: string; picture?: string; } } => {
        const { googleId, email } = googleData;

        const userByGoogleId = users.find(u => u.googleId === googleId);
        if (userByGoogleId) {
            setCurrentUser(userByGoogleId);
            setScreenHistory(['start']);
            return { success: true };
        }

        const userByEmail = users.find(u => u.email === email && !u.googleId);
        if (userByEmail) {
            return { success: false, message: 'This email is already registered manually. Please log in with your username and password.' };
        }

        return { success: false, needsRegistration: true, authData: googleData };
    };


    const handleLogout = () => {
        setCurrentUser(null);
        setScreenHistory(['start']);
    };

    const handleLogActivity = useCallback((activity: Omit<Activity, 'timestamp' | 'userId'>) => {
        if (!currentUser) return;
        setActivities(prev => [...prev, { ...activity, userId: currentUser.id, timestamp: new Date() }]);
    }, [currentUser]);
    
    const handleUpdateProfile = (updatedData: Partial<Omit<User, 'id'>>) => {
        if (!currentUser) return;

        // Update the master list of users
        const updatedUsers = users.map(u => 
            u.id === currentUser.id ? { ...u, ...updatedData } : u
        );
        setUsers(updatedUsers);

        // Update the currently logged-in user object
        const updatedCurrentUser = { ...currentUser, ...updatedData };
        setCurrentUser(updatedCurrentUser);
    };

    const renderMainContent = () => {
        if (!currentUser) {
            return <AuthScreen onRegister={handleRegister} onLogin={handleLogin} onGoogleSignIn={handleGoogleSignIn} />;
        }
        
        const userActivities = activities.filter(a => a.userId === currentUser.id);

        switch (currentScreen) {
            case 'start':
                return (
                    <StartScreen
                        onSelectNeuroLearn={() => navigateTo('neurolearn')}
                        onSelectSparkIQ={() => navigateTo('sparkiq')}
                    />
                );
            case 'neurolearn':
                return (
                    <NeuroLearnScreen
                        onLogActivity={handleLogActivity}
                        onBack={navigateBack}
                    />
                );
            case 'sparkiq':
                return (
                    <SparkIQScreen
                        onLogActivity={handleLogActivity}
                        onBack={navigateBack}
                    />
                );
            case 'profile':
                return <ProfileScreen user={currentUser} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} onBack={navigateBack} />;
            case 'activities':
                return <RecentActivitiesScreen activities={userActivities} onBack={navigateBack} onNavigateToDashboard={() => navigateTo('dashboard')} />;
            case 'dashboard':
                return <AnalyticsDashboardScreen activities={userActivities} onBack={navigateBack} />;
            default:
                return null;
        }
    };
    
    if (showSplash) {
        return <SplashScreen />;
    }

    return (
        <div 
            className="min-h-screen flex flex-col items-center justify-center p-4 font-sans relative bg-gradient-to-br from-pink-200 via-pink-300 to-pink-400"
        >
            {currentUser && (
                <Header
                    currentUser={currentUser}
                    onHome={() => setScreenHistory(['start'])}
                    onProfile={() => navigateTo('profile')}
                    onActivities={() => navigateTo('activities')}
                    onDashboard={() => navigateTo('dashboard')}
                    onLogout={handleLogout}
                />
            )}
            {renderMainContent()}
        </div>
    );
};