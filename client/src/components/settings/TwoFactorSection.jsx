import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { use2FA } from '../../hooks/use2FA';

const disableSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmDisable: Yup.boolean()
    .oneOf([true], 'You must confirm to disable 2FA')
    .required('You must confirm to disable 2FA')
});

const TwoFactorSection = ({ user = {} }) => {
  const [showDisableForm, setShowDisableForm] = useState(false);
  const { loading, error, disable2FA, clearError } = use2FA();

  const handleDisable = async (values, { setSubmitting, resetForm }) => {
    try {
      await disable2FA(values.password, values.confirmDisable.toString());
      setShowDisableForm(false);
      resetForm();
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Two-Factor Authentication
        </h3>
        
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            {user?.has2FAEnabled
              ? 'Two-factor authentication is currently enabled on your account.'
              : 'Add an extra layer of security to your account by enabling two-factor authentication.'}
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="mt-2 text-sm text-red-600 hover:text-red-500"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-5">
          {user?.has2FAEnabled ? (
            showDisableForm ? (
              <Formik
                initialValues={{ password: '', confirmDisable: false }}
                validationSchema={disableSchema}
                onSubmit={handleDisable}
              >
                {({ errors, touched, isSubmitting }) => (
                  <Form className="space-y-4">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <Field
                        type="password"
                        name="password"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      {errors.password && touched.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                      )}
                    </div>

                    <div>
                      <label className="flex items-center">
                        <Field
                          type="checkbox"
                          name="confirmDisable"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          I understand that disabling 2FA will make my account less secure
                        </span>
                      </label>
                      {errors.confirmDisable && touched.confirmDisable && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirmDisable}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <button
                        type="submit"
                        disabled={isSubmitting || loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {loading ? 'Disabling...' : 'Disable 2FA'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDisableForm(false)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            ) : (
              <button
                type="button"
                onClick={() => setShowDisableForm(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Disable 2FA
              </button>
            )
          ) : (
            <a
              href="/settings/2fa/setup"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Enable 2FA
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSection;
