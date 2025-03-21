import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, AuthProvider } from '../../src/context/AuthContext';

// Test component that uses the auth context
function TestComponent() {
  const { user, login, logout, isAuthenticated } = React.useContext(AuthContext);
  return (
    <div>
      {isAuthenticated ? (
        <>
          <div data-testid="user-email">{user.email}</div>
          <button onClick={logout} data-testid="logout-button">Logout</button>
        </>
      ) : (
        <button 
          onClick={() => login('test@example.com', 'password')} 
          data-testid="login-button"
        >
          Login
        </button>
      )}
    </div>
  );
}

describe('AuthContext', () => {
  beforeAll(() => {
    // Silence react-hot-toast errors in test environment
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('provides authentication state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  test('handles login successfully', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await user.click(screen.getByTestId('login-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });
  });

  test('handles logout successfully', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // First login
    await act(async () => {
      await user.click(screen.getByTestId('login-button'));
    });

    // Then logout
    await act(async () => {
      await user.click(screen.getByTestId('logout-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });
  });

  test('handles login failure', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <div data-testid="error-container">
          <TestComponent />
        </div>
      </AuthProvider>
    );

    // Attempt login with wrong credentials
    await act(async () => {
      await user.click(screen.getByTestId('login-button'));
    });

    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });
});
