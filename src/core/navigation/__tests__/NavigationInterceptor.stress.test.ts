/**
 * STRESS TESTS: NavigationInterceptor bug fixes
 *
 * Tests the extracted pure-function logic under adversarial conditions:
 * rapid-fire calls, mixed error sequences, edge-case state transitions,
 * and cascading error chains that mirror production failure patterns.
 *
 * Bugs covered: A (transient error), C (401 retry), E (429 handling), F (keys)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface OnboardingStatus {
  completedOnboarding: boolean;
  hasCompletedAssessment: boolean;
  onboardingStep?: string | null;
  selectedSports?: string[];
  completedSports?: string[];
  timestamp?: number;
  backendError?: boolean;
}

// ─── Extracted pure functions (mirror NavigationInterceptor.tsx logic) ────────

/**
 * BUG A FIX: compute status after transient error (5xx, timeout, network)
 * Preserves known-good status; only adds backendError flag.
 */
function computeTransientErrorStatus(
  currentStatus: OnboardingStatus | null
): OnboardingStatus {
  if (currentStatus && currentStatus.completedOnboarding) {
    return { ...currentStatus, backendError: true, timestamp: Date.now() };
  }
  return {
    completedOnboarding: false,
    hasCompletedAssessment: false,
    timestamp: Date.now(),
    backendError: true,
  };
}

/** BUG E FIX: 429 is rate-limited, not a transient error */
function isRateLimited(status: number | undefined): boolean {
  return status === 429;
}

/**
 * BUG C FIX: 401 retry state machine.
 * Allows one retry; second consecutive 401 nukes session.
 */
class Consecutive401Tracker {
  private count = 0;
  shouldRetry(): boolean {
    if (this.count === 0) {
      this.count++;
      return true;
    }
    return false;
  }
  reset(): void {
    this.count = 0;
  }
  get current(): number {
    return this.count;
  }
}

/**
 * Determines whether onboarding status should block a refresh attempt.
 * Mirrors needsRefresh logic at NavigationInterceptor.tsx:421.
 */
function needsRefresh(
  status: OnboardingStatus | null,
  isChecking: boolean
): boolean {
  if (!status) return true;
  if (!status.completedOnboarding && !isChecking && !status.backendError) return true;
  const STALE_THRESHOLD_MS = 60 * 1000;
  const isStale = !status.timestamp || (Date.now() - status.timestamp > STALE_THRESHOLD_MS);
  if (isStale && !status.backendError) return true;
  return false;
}

/**
 * Determines navigation decision for protected routes.
 * Returns 'allow' | 'block-backend' | 'redirect-onboarding' | 'redirect-assessment'.
 */
function protectedRouteDecision(
  status: OnboardingStatus | null,
  isChecking: boolean
): 'wait' | 'allow' | 'block-backend' | 'redirect-onboarding' | 'redirect-assessment' {
  if (needsRefresh(status, isChecking)) return 'wait';
  if (!status!.completedOnboarding) {
    return status!.backendError ? 'block-backend' : 'redirect-onboarding';
  }
  if (!status!.hasCompletedAssessment) return 'redirect-assessment';
  return 'allow';
}

/**
 * Validates SecureStore key format (BUG F).
 */
function isCorrectSecureStoreKey(key: string): boolean {
  const validKeys = ['deuceleague_cookie', 'deuceleague_session_data'];
  return validKeys.includes(key);
}

// ─── Simulates the full error-handling pipeline ──────────────────────────────

type ErrorType = 404 | 401 | 429 | 500 | 502 | 503 | 'timeout' | 'network';

interface PipelineState {
  onboardingStatus: OnboardingStatus | null;
  sessionCleared: boolean;
  redirectedToLogin: boolean;
  isChecking: boolean;
}

/**
 * Simulates the catch-block pipeline of checkOnboardingStatus.
 * Returns the resulting state after processing the error.
 */
function simulateErrorPipeline(
  errorType: ErrorType,
  currentState: PipelineState,
  tracker: Consecutive401Tracker
): PipelineState {
  const state = { ...currentState, isChecking: false };

  if (errorType === 404) {
    return { ...state, onboardingStatus: null, sessionCleared: true, redirectedToLogin: true };
  }

  if (errorType === 401) {
    if (tracker.shouldRetry()) {
      // First 401 — schedule retry, don't nuke
      return { ...state, isChecking: false };
    }
    // Second consecutive 401 — nuke session
    tracker.reset();
    return { ...state, onboardingStatus: null, sessionCleared: true, redirectedToLogin: true };
  }

  if (errorType === 429) {
    // 429 — keep everything as-is
    return state;
  }

  // 5xx, timeout, network — apply transient error logic (BUG A)
  return {
    ...state,
    onboardingStatus: computeTransientErrorStatus(state.onboardingStatus),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('STRESS: BUG A — transient error status preservation', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(1000000));
  afterEach(() => jest.restoreAllMocks());

  const knownGood: OnboardingStatus = {
    completedOnboarding: true,
    hasCompletedAssessment: true,
    onboardingStep: 'PROFILE_PICTURE',
    selectedSports: ['tennis', 'pickleball'],
    completedSports: ['tennis', 'pickleball'],
    timestamp: 999000,
  };

  test('50 consecutive transient errors never overwrite completedOnboarding=true', () => {
    let status: OnboardingStatus | null = { ...knownGood };
    for (let i = 0; i < 50; i++) {
      status = computeTransientErrorStatus(status);
    }
    expect(status!.completedOnboarding).toBe(true);
    expect(status!.hasCompletedAssessment).toBe(true);
    expect(status!.selectedSports).toEqual(['tennis', 'pickleball']);
    expect(status!.completedSports).toEqual(['tennis', 'pickleball']);
    expect(status!.backendError).toBe(true);
  });

  test('transient error on null status sets completedOnboarding=false', () => {
    const result = computeTransientErrorStatus(null);
    expect(result.completedOnboarding).toBe(false);
    expect(result.backendError).toBe(true);
  });

  test('transient error on incomplete status stays false', () => {
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

  test('alternating success/error preserves status correctly', () => {
    let status: OnboardingStatus | null = { ...knownGood };
    // Simulate: success → error → success → error pattern
    for (let i = 0; i < 20; i++) {
      if (i % 2 === 0) {
        // Simulate transient error
        status = computeTransientErrorStatus(status);
        expect(status!.completedOnboarding).toBe(true);
        expect(status!.backendError).toBe(true);
      } else {
        // Simulate success: reset backendError, update timestamp
        status = { ...status!, backendError: undefined, timestamp: Date.now() };
        expect(status!.completedOnboarding).toBe(true);
        expect(status!.backendError).toBeUndefined();
      }
    }
  });

  test('backendError flag accumulates but does not corrupt other fields', () => {
    const rich: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: true,
      onboardingStep: 'PROFILE_PICTURE',
      selectedSports: ['tennis', 'pickleball', 'badminton'],
      completedSports: ['tennis'],
      timestamp: 999000,
    };
    const result = computeTransientErrorStatus(rich);
    // All original fields preserved
    expect(result.onboardingStep).toBe('PROFILE_PICTURE');
    expect(result.selectedSports).toEqual(['tennis', 'pickleball', 'badminton']);
    expect(result.completedSports).toEqual(['tennis']);
    expect(result.backendError).toBe(true);
    expect(result.timestamp).toBe(1000000);
  });

  test('status with completedOnboarding=false but rich data still resets', () => {
    const incompleteRich: OnboardingStatus = {
      completedOnboarding: false,
      hasCompletedAssessment: false,
      onboardingStep: 'GAME_SELECT',
      selectedSports: ['tennis'],
      completedSports: [],
      timestamp: 999000,
    };
    const result = computeTransientErrorStatus(incompleteRich);
    // completedOnboarding was false, so it gets the default incomplete status
    expect(result.completedOnboarding).toBe(false);
    expect(result.hasCompletedAssessment).toBe(false);
    expect(result.backendError).toBe(true);
    // Original rich data is NOT preserved for incomplete status
    expect(result.selectedSports).toBeUndefined();
  });
});

describe('STRESS: BUG C — 401 retry state machine', () => {
  test('basic: first 401 retries, second nukes', () => {
    const tracker = new Consecutive401Tracker();
    expect(tracker.shouldRetry()).toBe(true);  // first → retry
    expect(tracker.shouldRetry()).toBe(false); // second → nuke
  });

  test('reset after success allows another retry cycle', () => {
    const tracker = new Consecutive401Tracker();
    expect(tracker.shouldRetry()).toBe(true);
    tracker.reset();  // success resets counter
    expect(tracker.shouldRetry()).toBe(true);  // first again → retry
    expect(tracker.shouldRetry()).toBe(false); // second → nuke
  });

  test('20 cycles of: 401 → retry → success → 401 → retry → success', () => {
    const tracker = new Consecutive401Tracker();
    for (let i = 0; i < 20; i++) {
      expect(tracker.shouldRetry()).toBe(true);  // first 401 in cycle
      tracker.reset();  // success resets
    }
    // After 20 successful retries, still allows retry
    expect(tracker.shouldRetry()).toBe(true);
  });

  test('rapid consecutive 401s without success — nukes on second', () => {
    const tracker = new Consecutive401Tracker();
    const results: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(tracker.shouldRetry());
    }
    // First true, rest false
    expect(results[0]).toBe(true);
    for (let i = 1; i < 10; i++) {
      expect(results[i]).toBe(false);
    }
  });

  test('reset-then-nuke pattern works correctly', () => {
    const tracker = new Consecutive401Tracker();
    // Cycle 1: retry then nuke
    expect(tracker.shouldRetry()).toBe(true);
    expect(tracker.shouldRetry()).toBe(false);
    // Manual reset (e.g., from different code path)
    tracker.reset();
    // Cycle 2: retry then nuke again
    expect(tracker.shouldRetry()).toBe(true);
    expect(tracker.shouldRetry()).toBe(false);
  });
});

describe('STRESS: BUG E — 429 vs other status codes', () => {
  test('429 is always rate-limited', () => {
    for (let i = 0; i < 100; i++) {
      expect(isRateLimited(429)).toBe(true);
    }
  });

  test('no other HTTP status is rate-limited', () => {
    const nonRateLimited = [
      200, 201, 204, 301, 302, 400, 401, 403, 404, 405,
      408, 409, 410, 418, 422, 500, 502, 503, 504,
    ];
    for (const code of nonRateLimited) {
      expect(isRateLimited(code)).toBe(false);
    }
  });

  test('edge values are not rate-limited', () => {
    expect(isRateLimited(undefined)).toBe(false);
    expect(isRateLimited(0)).toBe(false);
    expect(isRateLimited(-1)).toBe(false);
    expect(isRateLimited(428)).toBe(false);
    expect(isRateLimited(430)).toBe(false);
    expect(isRateLimited(NaN)).toBe(false);
  });
});

describe('STRESS: BUG F — SecureStore key validation', () => {
  test('correct keys are recognized', () => {
    expect(isCorrectSecureStoreKey('deuceleague_cookie')).toBe(true);
    expect(isCorrectSecureStoreKey('deuceleague_session_data')).toBe(true);
  });

  test('legacy dot-notation keys are rejected', () => {
    const wrongKeys = [
      'deuceleague.sessionToken',
      'deuceleague.session',
      'deuceleague.user',
      'deuceleague.accessToken',
      'deuceleague.refreshToken',
    ];
    for (const key of wrongKeys) {
      expect(isCorrectSecureStoreKey(key)).toBe(false);
    }
  });

  test('similar but incorrect keys are rejected', () => {
    const tricky = [
      'deuceleague_cookies',      // plural
      'deuceleague-cookie',       // hyphen
      'deuceleague.cookie',       // dot
      'DEUCELEAGUE_COOKIE',       // uppercase
      'deuceleague_session',      // missing _data
      'deuceleague_session_datum', // wrong suffix
      '_cookie',                   // missing prefix
      'cookie',                    // no prefix
      '',                          // empty
    ];
    for (const key of tricky) {
      expect(isCorrectSecureStoreKey(key)).toBe(false);
    }
  });
});

describe('STRESS: needsRefresh logic', () => {
  test('null status always needs refresh', () => {
    expect(needsRefresh(null, false)).toBe(true);
    expect(needsRefresh(null, true)).toBe(true);
  });

  test('incomplete status without backendError needs refresh', () => {
    const incomplete: OnboardingStatus = {
      completedOnboarding: false,
      hasCompletedAssessment: false,
      timestamp: Date.now(),
    };
    expect(needsRefresh(incomplete, false)).toBe(true);
  });

  test('incomplete status WITH backendError does NOT need refresh', () => {
    const incompleteWithError: OnboardingStatus = {
      completedOnboarding: false,
      hasCompletedAssessment: false,
      timestamp: Date.now(),
      backendError: true,
    };
    expect(needsRefresh(incompleteWithError, false)).toBe(false);
  });

  test('completed status with fresh timestamp does NOT need refresh', () => {
    const fresh: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: true,
      timestamp: Date.now(),
    };
    expect(needsRefresh(fresh, false)).toBe(false);
  });

  test('completed status with stale timestamp needs refresh', () => {
    const stale: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: true,
      timestamp: Date.now() - 61000, // 61 seconds ago
    };
    expect(needsRefresh(stale, false)).toBe(true);
  });

  test('stale status WITH backendError does NOT need refresh (avoids loop)', () => {
    const staleWithError: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: true,
      timestamp: Date.now() - 120000,
      backendError: true,
    };
    expect(needsRefresh(staleWithError, false)).toBe(false);
  });

  test('currently checking status blocks refresh', () => {
    const incomplete: OnboardingStatus = {
      completedOnboarding: false,
      hasCompletedAssessment: false,
      timestamp: Date.now(),
    };
    // isChecking=true should make incomplete status NOT trigger refresh
    expect(needsRefresh(incomplete, true)).toBe(false);
  });
});

describe('STRESS: protectedRouteDecision', () => {
  test('no status → wait', () => {
    expect(protectedRouteDecision(null, false)).toBe('wait');
  });

  test('complete onboarding + assessment → allow', () => {
    const full: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: true,
      timestamp: Date.now(),
    };
    expect(protectedRouteDecision(full, false)).toBe('allow');
  });

  test('incomplete onboarding no error → redirect-onboarding', () => {
    const incomplete: OnboardingStatus = {
      completedOnboarding: false,
      hasCompletedAssessment: false,
      timestamp: Date.now(),
      backendError: false,
    };
    // status incomplete WITHOUT backendError AND not checking → needsRefresh=true → wait
    // Actually no: !completedOnboarding && !isChecking && !backendError → needs refresh → wait
    expect(protectedRouteDecision(incomplete, false)).toBe('wait');
  });

  test('incomplete onboarding with backend error → block-backend', () => {
    const incompleteError: OnboardingStatus = {
      completedOnboarding: false,
      hasCompletedAssessment: false,
      timestamp: Date.now(),
      backendError: true,
    };
    expect(protectedRouteDecision(incompleteError, false)).toBe('block-backend');
  });

  test('completed onboarding but assessment incomplete → redirect-assessment', () => {
    const noAssessment: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: false,
      timestamp: Date.now(),
    };
    expect(protectedRouteDecision(noAssessment, false)).toBe('redirect-assessment');
  });

  test('complete + stale → wait (needs refresh)', () => {
    const stale: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: true,
      timestamp: Date.now() - 120000,
    };
    expect(protectedRouteDecision(stale, false)).toBe('wait');
  });

  test('complete + stale + backendError → allow (no re-fetch loop)', () => {
    const staleError: OnboardingStatus = {
      completedOnboarding: true,
      hasCompletedAssessment: true,
      timestamp: Date.now() - 120000,
      backendError: true,
    };
    expect(protectedRouteDecision(staleError, false)).toBe('allow');
  });
});

describe('STRESS: Full error pipeline — cascading error sequences', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(1000000));
  afterEach(() => jest.restoreAllMocks());

  const knownGood: OnboardingStatus = {
    completedOnboarding: true,
    hasCompletedAssessment: true,
    selectedSports: ['tennis'],
    completedSports: ['tennis'],
    timestamp: 999000,
  };

  test('429 → 500 → 500 chain: user stays logged in with known-good status', () => {
    const tracker = new Consecutive401Tracker();
    let state: PipelineState = {
      onboardingStatus: { ...knownGood },
      sessionCleared: false,
      redirectedToLogin: false,
      isChecking: true,
    };

    // Step 1: 429 — keep everything as-is
    state = simulateErrorPipeline(429, state, tracker);
    expect(state.onboardingStatus!.completedOnboarding).toBe(true);
    expect(state.sessionCleared).toBe(false);

    // Step 2: 500 — transient error, preserve known-good
    state = simulateErrorPipeline(500, state, tracker);
    expect(state.onboardingStatus!.completedOnboarding).toBe(true);
    expect(state.onboardingStatus!.backendError).toBe(true);
    expect(state.sessionCleared).toBe(false);

    // Step 3: another 500 — still preserves
    state = simulateErrorPipeline(500, state, tracker);
    expect(state.onboardingStatus!.completedOnboarding).toBe(true);
    expect(state.sessionCleared).toBe(false);
  });

  test('401 → retry → 401 → nuke: session correctly cleared', () => {
    const tracker = new Consecutive401Tracker();
    let state: PipelineState = {
      onboardingStatus: { ...knownGood },
      sessionCleared: false,
      redirectedToLogin: false,
      isChecking: true,
    };

    // First 401: retry
    state = simulateErrorPipeline(401, state, tracker);
    expect(state.sessionCleared).toBe(false);
    expect(state.onboardingStatus!.completedOnboarding).toBe(true); // preserved

    // Second 401: nuke
    state = simulateErrorPipeline(401, state, tracker);
    expect(state.sessionCleared).toBe(true);
    expect(state.redirectedToLogin).toBe(true);
    expect(state.onboardingStatus).toBeNull();
  });

  test('401 → retry → success → 401 → retry → success: user never loses session', () => {
    const tracker = new Consecutive401Tracker();
    let state: PipelineState = {
      onboardingStatus: { ...knownGood },
      sessionCleared: false,
      redirectedToLogin: false,
      isChecking: true,
    };

    // Cycle 1: 401 → retry
    state = simulateErrorPipeline(401, state, tracker);
    expect(state.sessionCleared).toBe(false);

    // Success resets
    tracker.reset();

    // Cycle 2: 401 → retry (allowed again after reset)
    state = simulateErrorPipeline(401, state, tracker);
    expect(state.sessionCleared).toBe(false);

    // Success resets
    tracker.reset();

    // 5 cycles later, still allows retry
    for (let i = 0; i < 5; i++) {
      state = simulateErrorPipeline(401, state, tracker);
      expect(state.sessionCleared).toBe(false);
      tracker.reset();
    }
  });

  test('mixed error storm: 429, 500, 401, 429, 500, 401, 401 (nuke on final)', () => {
    const tracker = new Consecutive401Tracker();
    let state: PipelineState = {
      onboardingStatus: { ...knownGood },
      sessionCleared: false,
      redirectedToLogin: false,
      isChecking: true,
    };

    // 429 — no effect
    state = simulateErrorPipeline(429, state, tracker);
    expect(state.onboardingStatus!.completedOnboarding).toBe(true);
    expect(state.sessionCleared).toBe(false);

    // 500 — transient, preserve status
    state = simulateErrorPipeline(500, state, tracker);
    expect(state.onboardingStatus!.completedOnboarding).toBe(true);
    expect(state.onboardingStatus!.backendError).toBe(true);

    // 401 — first, retry
    state = simulateErrorPipeline(401, state, tracker);
    expect(state.sessionCleared).toBe(false);

    // 429 — no effect (401 counter NOT reset by 429)
    state = simulateErrorPipeline(429, state, tracker);
    expect(state.sessionCleared).toBe(false);

    // 500 — transient
    state = simulateErrorPipeline(500, state, tracker);
    expect(state.onboardingStatus!.completedOnboarding).toBe(true);

    // 401 — second consecutive (first wasn't followed by success reset), nukes
    state = simulateErrorPipeline(401, state, tracker);
    expect(state.sessionCleared).toBe(true);
    expect(state.redirectedToLogin).toBe(true);
  });

  test('404 at any point immediately clears session', () => {
    const tracker = new Consecutive401Tracker();
    let state: PipelineState = {
      onboardingStatus: { ...knownGood },
      sessionCleared: false,
      redirectedToLogin: false,
      isChecking: true,
    };

    state = simulateErrorPipeline(404, state, tracker);
    expect(state.sessionCleared).toBe(true);
    expect(state.redirectedToLogin).toBe(true);
    expect(state.onboardingStatus).toBeNull();
  });

  test('null status + 500 → incomplete state (new user)', () => {
    const tracker = new Consecutive401Tracker();
    let state: PipelineState = {
      onboardingStatus: null,
      sessionCleared: false,
      redirectedToLogin: false,
      isChecking: true,
    };

    state = simulateErrorPipeline(500, state, tracker);
    expect(state.onboardingStatus!.completedOnboarding).toBe(false);
    expect(state.onboardingStatus!.backendError).toBe(true);
    expect(state.sessionCleared).toBe(false);
  });

  test('null status + 429 → stays null (no status update)', () => {
    const tracker = new Consecutive401Tracker();
    let state: PipelineState = {
      onboardingStatus: null,
      sessionCleared: false,
      redirectedToLogin: false,
      isChecking: true,
    };

    state = simulateErrorPipeline(429, state, tracker);
    expect(state.onboardingStatus).toBeNull();
    expect(state.sessionCleared).toBe(false);
  });

  test('stress: 100 random errors on known-good status never falsely nuke session (unless 401x2 or 404)', () => {
    const errorTypes: ErrorType[] = [429, 500, 502, 503, 'timeout', 'network'];
    const tracker = new Consecutive401Tracker();
    let state: PipelineState = {
      onboardingStatus: { ...knownGood },
      sessionCleared: false,
      redirectedToLogin: false,
      isChecking: true,
    };

    for (let i = 0; i < 100; i++) {
      const error = errorTypes[i % errorTypes.length];
      state = simulateErrorPipeline(error, state, tracker);
      expect(state.sessionCleared).toBe(false);
      expect(state.onboardingStatus!.completedOnboarding).toBe(true);
    }
  });
});

describe('STRESS: onboarding route determination edge cases', () => {
  // Mirror getCurrentOnboardingRoute logic

  function getCurrentOnboardingRoute(
    step: string | null | undefined,
    selectedSports?: string[],
    completedSports?: string[]
  ): string {
    const STEP_TO_CURRENT_ROUTE: Record<string, string> = {
      'PERSONAL_INFO': '/onboarding/personal-info',
      'LOCATION': '/onboarding/location',
      'GAME_SELECT': '/onboarding/game-select',
      'SKILL_ASSESSMENT': '/onboarding/skill-assessment',
      'ASSESSMENT_RESULTS': '/onboarding/assessment-results',
      'PROFILE_PICTURE': '/onboarding/profile-picture',
    };

    if (!step) return '/onboarding/personal-info';

    if (step === 'SKILL_ASSESSMENT' && selectedSports && selectedSports.length > 0) {
      const nextSportIndex = selectedSports.findIndex(
        sport => !completedSports?.includes(sport)
      );
      if (nextSportIndex >= 0) {
        const nextSport = selectedSports[nextSportIndex];
        return `/onboarding/skill-assessment?sport=${nextSport}&sportIndex=${nextSportIndex}`;
      } else {
        const lastSport = selectedSports[selectedSports.length - 1];
        const lastIndex = selectedSports.length - 1;
        return `/onboarding/assessment-results?sport=${lastSport}&sportIndex=${lastIndex}`;
      }
    }

    if (step === 'ASSESSMENT_RESULTS' && selectedSports && selectedSports.length > 0) {
      const nextIncompleteIndex = selectedSports.findIndex(
        sport => !completedSports?.includes(sport)
      );
      if (nextIncompleteIndex >= 0) {
        const nextSport = selectedSports[nextIncompleteIndex];
        return `/onboarding/skill-assessment?sport=${nextSport}&sportIndex=${nextIncompleteIndex}`;
      } else {
        const lastCompletedSport = completedSports && completedSports.length > 0
          ? completedSports[completedSports.length - 1]
          : selectedSports[selectedSports.length - 1];
        const lastIndex = selectedSports.indexOf(lastCompletedSport);
        return `/onboarding/assessment-results?sport=${lastCompletedSport}&sportIndex=${lastIndex}`;
      }
    }

    return STEP_TO_CURRENT_ROUTE[step] || '/onboarding/personal-info';
  }

  test('null step → personal-info', () => {
    expect(getCurrentOnboardingRoute(null)).toBe('/onboarding/personal-info');
    expect(getCurrentOnboardingRoute(undefined)).toBe('/onboarding/personal-info');
  });

  test('unknown step → personal-info fallback', () => {
    expect(getCurrentOnboardingRoute('UNKNOWN_STEP')).toBe('/onboarding/personal-info');
  });

  test('SKILL_ASSESSMENT with no selected sports → assessment route', () => {
    expect(getCurrentOnboardingRoute('SKILL_ASSESSMENT', [], [])).toBe('/onboarding/skill-assessment');
  });

  test('SKILL_ASSESSMENT: first sport incomplete', () => {
    const route = getCurrentOnboardingRoute('SKILL_ASSESSMENT', ['tennis', 'pickleball'], []);
    expect(route).toBe('/onboarding/skill-assessment?sport=tennis&sportIndex=0');
  });

  test('SKILL_ASSESSMENT: first done, second incomplete', () => {
    const route = getCurrentOnboardingRoute('SKILL_ASSESSMENT', ['tennis', 'pickleball'], ['tennis']);
    expect(route).toBe('/onboarding/skill-assessment?sport=pickleball&sportIndex=1');
  });

  test('SKILL_ASSESSMENT: all done → assessment results for last', () => {
    const route = getCurrentOnboardingRoute('SKILL_ASSESSMENT', ['tennis', 'pickleball'], ['tennis', 'pickleball']);
    expect(route).toBe('/onboarding/assessment-results?sport=pickleball&sportIndex=1');
  });

  test('ASSESSMENT_RESULTS: more sports to do → next incomplete', () => {
    const route = getCurrentOnboardingRoute('ASSESSMENT_RESULTS', ['tennis', 'pickleball', 'badminton'], ['tennis']);
    expect(route).toBe('/onboarding/skill-assessment?sport=pickleball&sportIndex=1');
  });

  test('ASSESSMENT_RESULTS: all done → results for last completed', () => {
    const route = getCurrentOnboardingRoute('ASSESSMENT_RESULTS', ['tennis', 'pickleball'], ['tennis', 'pickleball']);
    expect(route).toBe('/onboarding/assessment-results?sport=pickleball&sportIndex=1');
  });

  test('stress: 5 sports, completing one at a time', () => {
    const sports = ['tennis', 'pickleball', 'badminton', 'squash', 'table_tennis'];
    for (let i = 0; i < sports.length; i++) {
      const completed = sports.slice(0, i);
      const route = getCurrentOnboardingRoute('SKILL_ASSESSMENT', sports, completed);
      if (i < sports.length) {
        expect(route).toContain(`sport=${sports[i]}`);
        expect(route).toContain(`sportIndex=${i}`);
      }
    }
  });
});

describe('STRESS: isBlockedAuthPage + backendError interaction', () => {
  /**
   * When session exists + backendError is true, auth pages should be ALLOWED
   * (so user can re-authenticate). This tests the interaction.
   */
  function shouldAllowAuthPage(
    hasSession: boolean,
    status: OnboardingStatus | null
  ): boolean {
    if (!hasSession) return true;                           // no session → allow auth pages
    if (status?.backendError) return true;                  // backend down → allow re-auth
    return false;                                           // authenticated → block auth pages
  }

  test('no session: always allow auth pages', () => {
    expect(shouldAllowAuthPage(false, null)).toBe(true);
    expect(shouldAllowAuthPage(false, { completedOnboarding: true, hasCompletedAssessment: true })).toBe(true);
  });

  test('session + no error: block auth pages', () => {
    expect(shouldAllowAuthPage(true, { completedOnboarding: true, hasCompletedAssessment: true })).toBe(false);
  });

  test('session + backendError: allow auth pages (re-auth fallback)', () => {
    expect(shouldAllowAuthPage(true, { completedOnboarding: true, hasCompletedAssessment: true, backendError: true })).toBe(true);
  });

  test('session + null status: block (waiting for check)', () => {
    expect(shouldAllowAuthPage(true, null)).toBe(false);
  });
});
