import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { use2FA } from '../../src/hooks/use2FA';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn()
}));

jest.mock('axios');

describe('use2FA', () => {
  const navigate = jest.fn();
  const mockSuccessResponse = { data: { success: true } };
  
  beforeEach(() => {
    useNavigate.mockReturnValue(navigate);
    jest.clearAllMocks();
  });

  describe('setup2FA', () => {
    const mockSetupResponse = {
      data: {
        success: true,
        data: {
          qrCode: 'data:image/png;base64,mockedQRCode',
          recoveryCode: 'ABCD1234EFGH5678'
        }
      }
    };

    it('should handle successful 2FA setup', async () => {
      axios.post.mockResolvedValueOnce(mockSetupResponse);

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        await result.current.setup2FA('+1234567890', 'backup@example.com');
      });

      expect(axios.post).toHaveBeenCalledWith('/api/v1/2fa/setup', {
        phoneNumber: '+1234567890',
        backupEmail: 'backup@example.com'
      });
      expect(result.current.qrCode).toBe('data:image/png;base64,mockedQRCode');
      expect(result.current.recoveryCode).toBe('ABCD1234EFGH5678');
      expect(result.current.error).toBeNull();
    });

    it('should handle setup errors', async () => {
      const errorMessage = 'Failed to setup 2FA';
      axios.post.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        try {
          await result.current.setup2FA('+1234567890', 'backup@example.com');
        } catch (error) {
          // Error should be thrown
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('verify2FA', () => {
    it('should handle successful verification', async () => {
      axios.post.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        await result.current.verify2FA('123456', 'app');
      });

      expect(axios.post).toHaveBeenCalledWith('/api/v1/2fa/verify', {
        code: '123456',
        method: 'app'
      });
      expect(navigate).toHaveBeenCalledWith('/settings', {
        state: { message: '2FA successfully enabled' }
      });
      expect(result.current.error).toBeNull();
    });

    it('should handle verification errors', async () => {
      const errorMessage = 'Invalid verification code';
      axios.post.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        try {
          await result.current.verify2FA('123456', 'app');
        } catch (error) {
          // Error should be thrown
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('disable2FA', () => {
    it('should handle successful disabling', async () => {
      axios.post.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        await result.current.disable2FA('password123', 'true');
      });

      expect(axios.post).toHaveBeenCalledWith('/api/v1/2fa/disable', {
        password: 'password123',
        confirmDisable: 'true'
      });
      expect(navigate).toHaveBeenCalledWith('/settings', {
        state: { message: '2FA successfully disabled' }
      });
      expect(result.current.error).toBeNull();
    });

    it('should handle disable errors', async () => {
      const errorMessage = 'Invalid password';
      axios.post.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        try {
          await result.current.disable2FA('wrongpass', 'true');
        } catch (error) {
          // Error should be thrown
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('useRecoveryCode', () => {
    const mockRecoveryResponse = {
      data: {
        success: true,
        data: {
          newRecoveryCode: 'IJKL9012MNOP3456'
        }
      }
    };

    it('should handle successful recovery code use', async () => {
      axios.post.mockResolvedValueOnce(mockRecoveryResponse);

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        await result.current.useRecoveryCode('ABCD1234EFGH5678');
      });

      expect(axios.post).toHaveBeenCalledWith('/api/v1/2fa/recovery', {
        recoveryCode: 'ABCD1234EFGH5678'
      });
      expect(result.current.error).toBeNull();
    });

    it('should handle recovery code errors', async () => {
      const errorMessage = 'Invalid recovery code';
      axios.post.mockRejectedValueOnce({ 
        response: { data: { message: errorMessage } }
      });

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        try {
          await result.current.useRecoveryCode('INVALID1234CODE');
        } catch (error) {
          // Error should be thrown
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('verify2FAToken', () => {
    it('should return true for valid token', async () => {
      axios.get.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        const isValid = await result.current.verify2FAToken('validtoken');
        expect(isValid).toBe(true);
      });

      expect(axios.get).toHaveBeenCalledWith('/api/v1/2fa/verify-token', {
        headers: { 'x-2fa-token': 'validtoken' }
      });
    });

    it('should return false for invalid token', async () => {
      axios.get.mockRejectedValueOnce(new Error('Invalid token'));

      const { result } = renderHook(() => use2FA());

      await act(async () => {
        const isValid = await result.current.verify2FAToken('invalidtoken');
        expect(isValid).toBe(false);
      });
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => use2FA());

      // Set error first
      axios.post.mockRejectedValueOnce({ 
        response: { data: { message: 'Some error' } }
      });

      await act(async () => {
        try {
          await result.current.setup2FA('+1234567890', 'backup@example.com');
        } catch (error) {
          // Error should be thrown
        }
      });

      expect(result.current.error).toBe('Some error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
