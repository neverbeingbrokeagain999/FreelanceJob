import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import TwoFactorSection from '../../components/settings/TwoFactorSection';
import LoadingSpinner from '../../components/LoadingSpinner';

const TwoFactorSettings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated
    if (!user && !loading) {
      navigate('/login', { 
        state: { from: '/settings/2fa' },
        replace: true 
      });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900">
          Two-Factor Authentication Settings
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your two-factor authentication settings to enhance your account security.
        </p>
      </div>

      <div className="mt-6">
        <TwoFactorSection user={user} />
      </div>

      <div className="mt-10 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Security Recommendations
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Use an authenticator app (like Google Authenticator or Authy) instead of SMS when possible
              </li>
              <li>
                Store your recovery codes in a safe place - you'll need them if you lose access to your device
              </li>
              <li>
                Consider enabling 2FA on all your sensitive accounts, not just this one
              </li>
              <li>
                If you get a new device, remember to transfer your 2FA setup before disposing of the old one
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        <div className="mt-4 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-sm text-gray-500">
              {user?.lastTwoFactorVerification ? (
                <p>
                  Last 2FA verification: {new Date(user.lastTwoFactorVerification).toLocaleString()}
                </p>
              ) : (
                <p>No recent 2FA activity</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-red-800">
              Emergency Disable
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                If you're having issues with 2FA and can't access your account normally,
                you can use your recovery codes or contact support for assistance.
              </p>
            </div>
            <div className="mt-4">
              <a
                href="/support"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSettings;
