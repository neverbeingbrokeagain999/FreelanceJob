import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { use2FA } from '../../hooks/use2FA';
import { useLocation, useNavigate } from 'react-router-dom';

const verifySchema = Yup.object().shape({
  code: Yup.string()
    .matches(/^\d{6}$/, 'Code must be 6 digits')
    .required('Verification code is required')
});

const TwoFactorVerify = () => {
  const [showRecovery, setShowRecovery] = useState(false);
  const { loading, error, useRecoveryCode, verify2FA, clearError } = use2FA();
  const location = useLocation();
  const navigate = useNavigate();
  const { from } = location.state || { from: { pathname: '/' } };

  const handleVerification = async (values, { setSubmitting }) => {
    try {
      await verify2FA(values.code, 'app');
      navigate(from);
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecovery = async (values, { setSubmitting }) => {
    try {
      await useRecoveryCode(values.code);
      navigate(from);
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Two-Factor Authentication
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 text-sm text-red-600 hover:text-red-500"
          >
            Dismiss
          </button>
        </div>
      )}

      {!showRecovery ? (
        <>
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app to proceed.
            </p>
          </div>

          <Formik
            initialValues={{ code: '' }}
            validationSchema={verifySchema}
            onSubmit={handleVerification}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <Field
                    type="text"
                    name="code"
                    placeholder="Enter 6-digit code"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    autoComplete="off"
                  />
                  {errors.code && touched.code && (
                    <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isSubmitting || loading}
                    className="flex-1 mr-2 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRecovery(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Use recovery code
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Enter your recovery code to regain access to your account.
            </p>
          </div>

          <Formik
            initialValues={{ code: '' }}
            validationSchema={Yup.object().shape({
              code: Yup.string()
                .matches(/^[A-Z0-9]{16}$/, 'Invalid recovery code format')
                .required('Recovery code is required')
            })}
            onSubmit={handleRecovery}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Recovery Code
                  </label>
                  <Field
                    type="text"
                    name="code"
                    placeholder="Enter 16-character recovery code"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                    autoComplete="off"
                  />
                  {errors.code && touched.code && (
                    <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isSubmitting || loading}
                    className="flex-1 mr-2 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Use Recovery Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRecovery(false)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Back to code verification
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </>
      )}
    </div>
  );
};

export default TwoFactorVerify;
