import React from 'react';
import { useApp } from './context/AppContext';
import { HomeScreen } from './screens/HomeScreen';
import { FindArtisansPage } from './screens/FindArtisansPage';
import { HowItWorksPage } from './screens/HowItWorksPage';
import { BecomeArtisanPage } from './screens/BecomeArtisanPage';
import { JobsPage } from './screens/JobsPage';
import { AboutUsPage } from './screens/AboutUsPage';
import { LoginPage } from './screens/LoginPage';
import { SignUpPage } from './screens/SignUpPage';
import { HelpCenterPage } from './screens/HelpCenterPage';
import { SafetyPage } from './screens/SafetyPage';
import { LegalPage } from './screens/LegalPage';

// Mobile app workflow screens
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ClientDashboardScreen } from './screens/ClientDashboardScreen';
import { PostJobScreen } from './screens/PostJobScreen';
import { MatchListScreen } from './screens/MatchListScreen';
import { PaystackCheckoutModal } from './screens/PaystackCheckoutModal';
import { ChatScreen } from './screens/ChatScreen';
import { JobCompletionRatingModal } from './screens/JobCompletionRatingModal';
import { ArtisanSignupScreen } from './screens/ArtisanSignupScreen';
import { VerificationPendingScreen } from './screens/VerificationPendingScreen';
import { ArtisanDashboardScreen } from './screens/ArtisanDashboardScreen';
import { AdminQueueScreen } from './screens/AdminQueueScreen';
import { Toast } from './components/Toast';

export function AppContent() {
  const { currentScreen, userRole } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      // Marketing Website 7 Pages
      case 'home':
        return <HomeScreen />;
      case 'find_artisans':
        return <FindArtisansPage />;
      case 'how_it_works':
        return <HowItWorksPage />;
      case 'become_artisan':
        return <BecomeArtisanPage />;
      case 'jobs_board':
        return <JobsPage />;
      case 'about_us':
        return <AboutUsPage />;
      case 'login':
        return <LoginPage />;
      case 'signup':
        return <SignUpPage />;
      case 'help_center':
        return <HelpCenterPage />;
      case 'safety':
        return <SafetyPage />;
      case 'terms':
        return <LegalPage type="terms" />;
      case 'privacy':
        return <LegalPage type="privacy" />;

      // Application Workflows
      case 'onboarding':
        return <OnboardingScreen />;
      case 'auth':
        return <AuthScreen role={userRole} />;
      case 'client_dash':
        return <ClientDashboardScreen />;
      case 'post_job':
        return <PostJobScreen />;
      case 'match_list':
        return <MatchListScreen />;
      case 'checkout':
        return <PaystackCheckoutModal />;
      case 'chat':
        return <ChatScreen />;
      case 'complete_rating':
        return <JobCompletionRatingModal />;
      case 'artisan_signup':
        return <ArtisanSignupScreen />;
      case 'artisan_pending':
        return <VerificationPendingScreen />;
      case 'artisan_dash':
        return <ArtisanDashboardScreen />;
      case 'admin_queue':
        return <AdminQueueScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen font-sans antialiased">
      {renderScreen()}
      <Toast />
    </div>
  );
}
