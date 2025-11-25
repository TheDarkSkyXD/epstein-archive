import { useState, useEffect } from 'react';

export const useInvestigationOnboarding = () => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('hasSeenInvestigationOnboarding');
    if (stored !== null) {
      return JSON.parse(stored);
    }
    
    // Check if user is logged in and has profile setting
    // This would be extended when user authentication is implemented
    return false;
  });

  const markOnboardingAsSeen = () => {
    setHasSeenOnboarding(true);
    localStorage.setItem('hasSeenInvestigationOnboarding', JSON.stringify(true));
  };

  const resetOnboarding = () => {
    setHasSeenOnboarding(false);
    localStorage.setItem('hasSeenInvestigationOnboarding', JSON.stringify(false));
  };

  return {
    hasSeenOnboarding,
    markOnboardingAsSeen,
    resetOnboarding
  };
};