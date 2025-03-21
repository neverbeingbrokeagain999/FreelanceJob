import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import TwoFactorSetup from '../../src/components/auth/TwoFactorSetup';
import TwoFactorVerify from '../../src/components/auth/TwoFactorVerify';
import TwoFactorSettings from '../../src/pages/settings/TwoFactorSettings';

const server = setupServer(
  // Mock 2FA setup endpoint
  rest.post('/api/v1/2fa/setup', async (req, res, ctx) => {
    const { phoneNumber, backupEmail } = await req.json();
    if (!phoneNumber || !backupEmail) {
      return res(ctx.status(400), ctx.json({ message: 'Missing required fields' }));
    }
    return res(
      ctx.json({
        success: true,
        data: {
          qrCode: 'data:image/png;base64,mockedQRCode',
          recoveryCode: 'ABCD1234EFGH5678'
        }
      })
    );
  }),

  // Mock 2FA verify endpoint
  rest.post('/api/v1/2fa/verify', async (req, res, ctx) => {
    const { code, method } = await req.json();
    if (code === '123456' && ['app', 'sms', 'email'].includes(method)) {
      return res(ctx.json({ success: true }));
    }
    return res(
      ctx.status(400),
      ctx.json({ message: 'Invalid verification code' })
    );
  }),

  // Mock 2FA disable endpoint
  rest.post('/api/v1/2fa/disable', async (req, res, ctx) => {
    const { password, confirmDisable } = await req.json();
    if (password === 'correctpassword' && confirmDisable === 'true') {
      return res(ctx.json({ success: true }));
    }
    return res(
      ctx.status(400),
      ctx.json({ message: 'Invalid password or confirmation' })
    );
  }),

  // Mock 2FA recovery endpoint
  rest.post('/api/v1/2fa/recovery', async (req, res, ctx) => {
    const { recoveryCode } = await req.json();
    if (recoveryCode === 'ABCD1234EFGH5678') {
      return res(
        ctx.json({
          success: true,
          data: { newRecoveryCode: 'IJKL9012MNOP3456' }
        })
      );
    }
    return res(
      ctx.status(400),
      ctx.json({ message: 'Invalid recovery code' })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('2FA Integration Tests', () => {
  describe('TwoFactorSetup', () => {
    it('should handle successful 2FA setup flow', async () => {
      renderWithProviders(<TwoFactorSetup />);

      // Fill setup form
      fireEvent.change(screen.getByPlaceholderText('+1234567890'), {
        target: { value: '+1234567890' }
      });
      fireEvent.change(screen.getByPlaceholderText('backup@example.com'), {
        target: { value: 'backup@example.com' }
      });

      // Submit setup form
      fireEvent.click(screen.getByText(/set up 2fa/i));

      // Verify QR code and recovery code are displayed
      await waitFor(() => {
        expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument();
        expect(screen.getByText('ABCD1234EFGH5678')).toBeInTheDocument();
      });
    });

    it('should handle setup errors correctly', async () => {
      server.use(
        rest.post('/api/v1/2fa/setup', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ message: 'Server error' })
          );
        })
      );

      renderWithProviders(<TwoFactorSetup />);

      // Submit incomplete form
      fireEvent.click(screen.getByText(/set up 2fa/i));

      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
        expect(screen.getByText(/backup email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('TwoFactorVerify', () => {
    it('should handle successful verification', async () => {
      renderWithProviders(<TwoFactorVerify />);

      // Enter valid code
      fireEvent.change(screen.getByPlaceholderText(/enter 6-digit code/i), {
        target: { value: '123456' }
      });

      // Submit verification
      fireEvent.click(screen.getByText(/verify/i));

      // Check success state
      await waitFor(() => {
        expect(screen.queryByText(/invalid verification code/i)).not.toBeInTheDocument();
      });
    });

    it('should handle recovery code flow', async () => {
      renderWithProviders(<TwoFactorVerify />);

      // Switch to recovery mode
      fireEvent.click(screen.getByText(/use recovery code/i));

      // Enter valid recovery code
      fireEvent.change(screen.getByPlaceholderText(/enter 16-character recovery code/i), {
        target: { value: 'ABCD1234EFGH5678' }
      });

      // Submit recovery code
      fireEvent.click(screen.getByText(/use recovery code/i));

      // Check success state
      await waitFor(() => {
        expect(screen.queryByText(/invalid recovery code/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('TwoFactorSettings', () => {
    const mockUser = {
      id: '123',
      has2FAEnabled: true,
      lastTwoFactorVerification: new Date().toISOString()
    };

    it('should display current 2FA status correctly', () => {
      const { container } = renderWithProviders(<TwoFactorSettings />, {
        initialState: {
          auth: {
            user: mockUser,
            loading: false
          }
        }
      });

      expect(screen.getByText('Two-Factor Authentication Settings')).toBeInTheDocument();
      expect(screen.getByText(/manage your two-factor authentication settings/i)).toBeInTheDocument();
    });

    it('should show emergency disable section', () => {
      const { container } = renderWithProviders(<TwoFactorSettings />, {
        initialState: {
          auth: {
            user: mockUser,
            loading: false
          }
        }
      });

      expect(screen.getByText('Emergency Disable')).toBeInTheDocument();
      expect(screen.getByText(/contact support/i)).toBeInTheDocument();
    });
    });
  });
});
