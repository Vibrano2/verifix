import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiService } from '../services/api';

const AppContext = createContext();

const screenPaths = {
  home: '/',
  find_artisans: '/find-artisans',
  how_it_works: '/how-it-works',
  become_artisan: '/become-an-artisan',
  jobs_board: '/jobs',
  about_us: '/about',
  login: '/login',
  signup: '/signup',
  help_center: '/help-center',
  safety: '/safety-security',
  terms: '/terms',
  privacy: '/privacy',
};

const pathScreens = Object.fromEntries(
  Object.entries(screenPaths).map(([screen, path]) => [path, screen])
);

export function AppProvider({ children }) {
  // Navigation screen state
  const [currentScreen, setCurrentScreen] = useState(() => pathScreens[window.location.pathname] || 'home');
  
  // Active User session
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('client'); // 'client' | 'artisan' | 'admin'

  // Contextual workflow state
  const [activeJob, setActiveJob] = useState(null);
  const [activeArtisan, setActiveArtisan] = useState(null);
  const [activeMatchId, setActiveMatchId] = useState(null);

  // Network Simulation state (for testing intermittent network retry screens)
  const [isOffline, setIsOffline] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  useEffect(() => {
    ApiService.init();
    // Check localStorage for logged in user
    try {
      const storedUser = localStorage.getItem('artiva_current_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        setUserRole(parsed.role || 'client');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentScreen(pathScreens[window.location.pathname] || 'home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  };

  const navigateTo = (screen, params = {}) => {
    if (params.job) setActiveJob(params.job);
    if (params.artisan) setActiveArtisan(params.artisan);
    if (params.matchId) setActiveMatchId(params.matchId);
    setCurrentScreen(screen);
    const path = screenPaths[screen];
    if (path && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logout = () => {
    localStorage.removeItem('artiva_current_user');
    setCurrentUser(null);
    setUserRole('client');
    setActiveJob(null);
    setActiveArtisan(null);
    setActiveMatchId(null);
    setCurrentScreen('onboarding');
    showToast('Logged out successfully', 'info');
  };

  const value = {
    currentScreen,
    setCurrentScreen,
    navigateTo,
    currentUser,
    setCurrentUser,
    userRole,
    setUserRole,
    activeJob,
    setActiveJob,
    activeArtisan,
    setActiveArtisan,
    activeMatchId,
    setActiveMatchId,
    isOffline,
    setIsOffline,
    toast,
    showToast,
    logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
