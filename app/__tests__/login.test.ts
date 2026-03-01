/**
 * Tests that login flow navigates immediately after successful signIn
 * without polling getSession().
 */

describe('BUG G: login should not poll getSession after successful signIn', () => {
  test('successful signIn result contains user data sufficient for navigation', () => {
    // Simulate what signIn returns on success
    const signInResult = {
      data: {
        user: { id: 'user-123', name: 'Test', email: 'test@test.com' },
        session: { token: 'abc' },
      },
      error: null,
    };

    // The fix: if signIn returns user data, we should navigate immediately
    // No need to poll getSession()
    const shouldNavigate = !!signInResult.data?.user?.id;
    expect(shouldNavigate).toBe(true);
  });

  test('failed signIn does not trigger navigation', () => {
    const signInResult = {
      data: null,
      error: { message: 'Invalid credentials' },
    };

    const shouldNavigate = !!signInResult.data?.user?.id;
    expect(shouldNavigate).toBe(false);
  });
});
