import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const use2FA = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [recoveryCode, setRecoveryCode] = useState(null);
  const navigate = useNavigate();

  // Initialize 2FA setup
  const setup2FA = useCallback(async (phoneNumber, backupEmail) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/v1/2fa/setup', {
        phoneNumber,
        backupEmail
      });
      const { qrCode, recoveryCode } = response.data.data;
      setQrCode(qrCode);
      setRecoveryCode(recoveryCode);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to setup 2FA');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify 2FA code
  const verify2FA = useCallback(async (code, method) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/v1/2fa/verify', {
        code,
        method
      });
      navigate('/settings', { 
        state: { message: '2FA successfully enabled' }
      });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Disable 2FA
  const disable2FA = useCallback(async (password, confirmDisable) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/v1/2fa/disable', {
        password,
        confirmDisable
      });
      navigate('/settings', { 
        state: { message: '2FA successfully disabled' }
      });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Use recovery code
  const useRecoveryCode = useCallback(async (recoveryCode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/v1/2fa/recovery', {
        recoveryCode
      });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid recovery code');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check 2FA token for sensitive operations
  const verify2FAToken = useCallback(async (token) => {
    try {
      // Add token to request headers
      const config = {
        headers: { 'x-2fa-token': token }
      };
      await axios.get('/api/v1/2fa/verify-token', config);
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  return {
    loading,
    error,
    qrCode,
    recoveryCode,
    setup2FA,
    verify2FA,
    disable2FA,
    useRecoveryCode,
    verify2FAToken,
    clearError: () => setError(null)
  };
};
