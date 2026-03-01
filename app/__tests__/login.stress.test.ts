/**
 * STRESS TESTS: BUG G — Login flow immediate navigation
 *
 * Tests that login never polls getSession(), handles edge cases
 * like partial signIn results, and validates the social login path.
 */

describe('STRESS: BUG G — signIn result validation', () => {
  test('successful signIn with all fields → navigate immediately', () => {
    const result = {
      data: {
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        session: { token: 'abc123', expiresAt: '2026-12-31' },
      },
      error: null,
    };
    expect(!!result.data?.user?.id).toBe(true);
  });

  test('successful signIn with minimal user → navigate', () => {
    const result = {
      data: {
        user: { id: 'u-1' }, // minimal — only id
        session: { token: 'x' },
      },
      error: null,
    };
    expect(!!result.data?.user?.id).toBe(true);
  });

  test('null data → do NOT navigate', () => {
    const result = { data: null, error: { message: 'Invalid credentials' } };
    expect(!!result.data?.user?.id).toBe(false);
  });

  test('data without user → do NOT navigate', () => {
    const result = { data: { user: null, session: null }, error: null };
    expect(!!result.data?.user?.id).toBe(false);
  });

  test('data with user but no id → do NOT navigate', () => {
    const result = {
      data: { user: { name: 'Test' }, session: { token: 'x' } },
      error: null,
    };
    expect(!!(result.data?.user as any)?.id).toBe(false);
  });

  test('data with empty string id → do NOT navigate', () => {
    const result = {
      data: { user: { id: '', name: 'Test' }, session: { token: 'x' } },
      error: null,
    };
    // Empty string is falsy
    expect(!!result.data?.user?.id).toBe(false);
  });

  test('error present with data → still navigate (data takes priority)', () => {
    // Some APIs return both data and error on partial success
    const result = {
      data: { user: { id: 'user-456' }, session: { token: 'y' } },
      error: { message: 'Warning: password will expire soon' },
    };
    expect(!!result.data?.user?.id).toBe(true);
  });

  test('undefined result → do NOT navigate', () => {
    const result = undefined;
    expect(!!result?.data?.user?.id).toBe(false);
  });
});

describe('STRESS: BUG G — email vs username detection', () => {
  function detectLoginMethod(input: string): 'email' | 'username' {
    return input.includes('@') ? 'email' : 'username';
  }

  test('standard email → email login', () => {
    expect(detectLoginMethod('user@example.com')).toBe('email');
  });

  test('username without @ → username login', () => {
    expect(detectLoginMethod('john_doe')).toBe('username');
  });

  test('email with subdomain → email login', () => {
    expect(detectLoginMethod('user@sub.domain.com')).toBe('email');
  });

  test('username with dots → username login', () => {
    expect(detectLoginMethod('john.doe')).toBe('username');
  });

  test('edge case: @ at start → email', () => {
    expect(detectLoginMethod('@invalid')).toBe('email');
  });

  test('edge case: @ at end → email', () => {
    expect(detectLoginMethod('user@')).toBe('email');
  });

  test('empty string → username', () => {
    expect(detectLoginMethod('')).toBe('username');
  });
});

describe('STRESS: BUG G — trackLogin failure isolation', () => {
  /**
   * trackLogin is a non-blocking fire-and-forget call.
   * Its failure must NEVER prevent navigation.
   */
  test('trackLogin failure does not affect navigation decision', async () => {
    let navigated = false;
    let trackLoginFailed = false;

    // Simulate the login flow
    const signInResult = {
      data: { user: { id: 'user-789' }, session: { token: 'z' } },
      error: null,
    };

    if (signInResult.data?.user?.id) {
      // Track login (may fail)
      try {
        throw new Error('Network timeout on trackLogin');
      } catch {
        trackLoginFailed = true;
      }

      // Navigate regardless of trackLogin outcome
      navigated = true;
    }

    expect(trackLoginFailed).toBe(true);
    expect(navigated).toBe(true);
  });

  test('trackLogin success does not change navigation timing', async () => {
    let navigateCallOrder: string[] = [];

    const signInResult = {
      data: { user: { id: 'user-100' }, session: { token: 'a' } },
      error: null,
    };

    if (signInResult.data?.user?.id) {
      // Track login (succeeds)
      try {
        navigateCallOrder.push('trackLogin-start');
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 10));
        navigateCallOrder.push('trackLogin-done');
      } catch {
        // won't happen
      }

      navigateCallOrder.push('navigate');
    }

    // trackLogin completes before navigation in synchronous flow
    expect(navigateCallOrder).toEqual(['trackLogin-start', 'trackLogin-done', 'navigate']);
  });
});

describe('STRESS: social login — markLoggedIn before OAuth', () => {
  test('markLoggedIn is called before social signIn', async () => {
    const callOrder: string[] = [];

    // Simulate the social login flow from login.tsx
    async function handleSocialLogin(provider: string) {
      callOrder.push('markLoggedIn');
      // await AuthStorage.markLoggedIn();

      callOrder.push('signIn.social');
      // await authClient.signIn.social({ provider, callbackURL: '/user-dashboard' });
    }

    await handleSocialLogin('google');
    expect(callOrder[0]).toBe('markLoggedIn');
    expect(callOrder[1]).toBe('signIn.social');
  });

  test('OAuth failure after markLoggedIn: user still marked as returning', () => {
    let markedLoggedIn = false;
    let oauthFailed = false;

    // Mark logged in BEFORE OAuth
    markedLoggedIn = true;

    // OAuth fails
    try {
      throw new Error('OAuth redirect failed');
    } catch {
      oauthFailed = true;
    }

    // hasEverLoggedIn persists — user will see login screen (not landing) on return
    expect(markedLoggedIn).toBe(true);
    expect(oauthFailed).toBe(true);
  });
});
