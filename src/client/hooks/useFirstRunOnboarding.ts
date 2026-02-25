import { useState, useEffect } from 'react';

export const useFirstRunOnboarding = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      localStorage.setItem('firstRunOnboardingCompleted', 'true');
      localStorage.setItem('board_onboarding_seen', 'true');
      setShouldShowOnboarding(false);
      return;
    }

    // Check if this is the first run by looking at localStorage
    const hasCompletedOnboarding = localStorage.getItem('firstRunOnboardingCompleted');

    if (!hasCompletedOnboarding) {
      setShouldShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('firstRunOnboardingCompleted', 'true');
    setShouldShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('firstRunOnboardingCompleted', 'true');
    setShouldShowOnboarding(false);
  };

  return {
    shouldShowOnboarding,
    completeOnboarding,
    skipOnboarding,
  };
};
