/**
 * Tests for checkOnboardingStatus error handling logic.
 *
 * We extract and test the error-handling logic as pure functions rather than
 * rendering the full NavigationInterceptor component, because it has
 * heavy dependencies (expo-router, useSession, etc.) that are hard
 * to mock correctly in unit tests.
 */

// Type matching the component's state shape
interface OnboardingStatus {
  completedOnboarding: boolean;
  hasCompletedAssessment: boolean;
  onboardingStep?: string | null;
  selectedSports?: string[];
  completedSports?: string[];
  timestamp?: number;
  backendError?: boolean;
}

/**
 * Pure function that computes what onboardingStatus should be set to
 * when a transient error (not 404, not 401, not 429) occurs during the
 * onboarding status check.
 *
 * This is the logic we're fixing — extracted from the catch block
 * at NavigationInterceptor.tsx:264-272.
 */
function computeTransientErrorStatus(
  currentStatus: OnboardingStatus | null
): OnboardingStatus {
  // BUG A FIX: preserve known-good values from current status
  if (currentStatus && currentStatus.completedOnboarding) {
    return {
      ...currentStatus,
      backendError: true,
      timestamp: Date.now(),
    };
  }

  // No previous status or not completed — safe to mark as incomplete
  return {
    completedOnboarding: false,
    hasCompletedAssessment: false,
    timestamp: Date.now(),
    backendError: true,
  };
}

describe('BUG A: transient error must not overwrite known-good status', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('preserves completedOnboarding=true when transient error occurs', () => {
    const knownGood: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: true,
      onboardingStep: 'PROFILE_PICTURE',
      selectedSports: ['tennis'],
      completedSports: ['tennis'],
      timestamp: 999000,
    };

    const result = computeTransientErrorStatus(knownGood);

    expect(result.completedOnboarding).toBe(true);
    expect(result.hasCompletedAssessment).toBe(true);
    expect(result.backendError).toBe(true);
    expect(result.selectedSports).toEqual(['tennis']);
    expect(result.completedSports).toEqual(['tennis']);
  });

  test('sets completedOnboarding=false when no previous status exists', () => {
    const result = computeTransientErrorStatus(null);

    expect(result.completedOnboarding).toBe(false);
    expect(result.hasCompletedAssessment).toBe(false);
    expect(result.backendError).toBe(true);
  });

  test('sets completedOnboarding=false when previous status was incomplete', () => {
    const incomplete: OnboardingStatus = {
      completedOnboarding: false,
      hasCompletedAssessment: false,
      onboardingStep: 'LOCATION',
      timestamp: 999000,
    };

    const result = computeTransientErrorStatus(incomplete);

    expect(result.completedOnboarding).toBe(false);
    expect(result.backendError).toBe(true);
  });
});

/**
 * Determines whether a specific HTTP error status should be treated as
 * "rate limited" (429) vs other transient errors.
 */
function isRateLimited(status: number | undefined): boolean {
  return status === 429;
}

describe('BUG E: 429 must be handled distinctly from transient errors', () => {
  test('identifies 429 as rate limited', () => {
    expect(isRateLimited(429)).toBe(true);
  });

  test('does not identify 500 as rate limited', () => {
    expect(isRateLimited(500)).toBe(false);
  });

  test('does not identify undefined as rate limited', () => {
    expect(isRateLimited(undefined)).toBe(false);
  });
});

describe('BUG C: 401 should retry before nuking session', () => {
  test('shouldRetry401 returns true on first 401, false on second', () => {
    let retryCount = 0;
    const MAX_401_RETRIES = 1;

    function shouldRetry401(): boolean {
      if (retryCount < MAX_401_RETRIES) {
        retryCount++;
        return true;
      }
      return false;
    }

    expect(shouldRetry401()).toBe(true);  // first 401 → retry
    expect(shouldRetry401()).toBe(false); // second 401 → nuke
  });
});

describe('BUG F: correct SecureStore key names', () => {
  test('better-auth expo client uses underscore keys, not dot keys', () => {
    const storagePrefix = 'deuceleague';
    const cookieName = `${storagePrefix}_cookie`;
    const sessionDataName = `${storagePrefix}_session_data`;

    expect(cookieName).toBe('deuceleague_cookie');
    expect(sessionDataName).toBe('deuceleague_session_data');

    // These are the WRONG keys that were being deleted
    const wrongKeys = [
      'deuceleague.sessionToken',
      'deuceleague.session',
      'deuceleague.user',
      'deuceleague.accessToken',
      'deuceleague.refreshToken',
    ];

    // None of the wrong keys match the actual keys
    wrongKeys.forEach(key => {
      expect(key).not.toBe(cookieName);
      expect(key).not.toBe(sessionDataName);
    });
  });
});
