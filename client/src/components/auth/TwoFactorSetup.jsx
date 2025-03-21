import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { use2FA } from '../../hooks/use2FA';

const setupSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .matches(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format. Must include country code.')
    .required('Phone number is required'),
  backupEmail: Yup.string()
    .email('Must be a valid email')
    .required('Backup email is required')
});

const verificationSchema = Yup.object().shape({
  code: Yup.string()
    .matches(/^\d{6}$/, 'Code must be 6 digits')
    .required('Verification code is required'),
  method: Yup.string()
    .oneOf(['sms', 'email', 'app'], 'Invalid verification method')
    .required('Verification method is required')
});

export const TwoFactorSetup = () => {
  const [step, setStep] = useState('setup'); // setup, verify, complete
  const { loading, error, qrCode, recoveryCode, setup2FA, verify2FA, clearError } = use2FA();

  const handleSetup = async (values, { setSubmitting }) => {
    try {
      await setup2FA(values.phoneNumber, values.backupEmail);
      setStep('verify');
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerification = async (values, { setSubmitting }) => {
    try {
      await verify2FA(values.code, values.method);
      setStep('complete');
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setSubmitting(false);
    }
  };

  const renderSetupForm = () => (
    <Formik
      initialValues={{ phoneNumber: '', backupEmail: '' }}
      validationSchema={setupSchema}
      onSubmit={handleSetup}
    >
      {({ errors, touched, isSubmitting }) => (
        <Form className="space-y-4">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <Field
              type="text"
              name="phoneNumber"
              placeholder="+1234567890"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {errors.phoneNumber && touched.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="backupEmail" className="block text-sm font-medium text-gray-700">
              Backup Email
            </label>
            <Field
              type="email"
              name="backupEmail"
              placeholder="backup@example.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {errors.backupEmail && touched.backupEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.backupEmail}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Set up 2FA'}
          </button>
        </Form>
      )}
    </Formik>
  );

  const renderVerificationForm = () => (
    <div className="space-y-6">
      {qrCode && (
        <div className="text-center">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Scan this QR code with your authenticator app
          </p>
          <img src={qrCode} alt="2FA QR Code" className="mx-auto" />
        </div>
      )}

      <Formik
        initialValues={{ code: '', method: 'app' }}
        validationSchema={verificationSchema}
        onSubmit={handleVerification}
      >
        {({ errors, touched, isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label htmlFor="method" className="block text-sm font-medium text-gray-700">
                Verification Method
              </label>
              <Field
                as="select"
                name="method"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="app">Authenticator App</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </Field>
              {errors.method && touched.method && (
                <p className="mt-1 text-sm text-red-600">{errors.method}</p>
              )}
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <Field
                type="text"
                name="code"
                placeholder="Enter 6-digit code"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.code && touched.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </Form>
        )}
      </Formik>

      {recoveryCode && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">Save your recovery code</h3>
          <p className="mt-2 text-sm text-yellow-700">
            Store this code in a secure place. You'll need it if you lose access to your device:
          </p>
          <code className="mt-2 block p-2 bg-white rounded border border-yellow-300 font-mono text-sm">
            {recoveryCode}
          </code>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Two-Factor Authentication Setup
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

      {step === 'setup' && renderSetupForm()}
      {step === 'verify' && renderVerificationForm()}
      {step === 'complete' && (
        <div className="text-center">
          <h3 className="text-lg font-medium text-green-600">2FA Setup Complete!</h3>
          <p className="mt-2 text-sm text-gray-600">
            You can now use two-factor authentication to secure your account.
          </p>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;
