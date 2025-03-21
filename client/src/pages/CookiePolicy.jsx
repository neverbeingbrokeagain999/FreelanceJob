import React from 'react';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">Cookie Policy</h1>
        
        <div className="bg-white shadow rounded-lg p-8">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">What Are Cookies?</h2>
            <p className="text-gray-600 mb-4">
              Cookies are small text files that are placed on your computer or mobile device when you visit our website. 
              They are widely used to make websites work more efficiently and provide a better user experience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Cookies</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>To remember your preferences and settings</li>
              <li>To keep you signed in to your account</li>
              <li>To understand how you use our website</li>
              <li>To personalize your experience</li>
              <li>To improve our services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Types of Cookies We Use</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2">Essential Cookies</h3>
                <p className="text-gray-600">
                  Required for the website to function properly. These cannot be disabled.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Performance Cookies</h3>
                <p className="text-gray-600">
                  Help us understand how visitors interact with our website.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Functionality Cookies</h3>
                <p className="text-gray-600">
                  Remember your preferences and personalize your experience.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Marketing Cookies</h3>
                <p className="text-gray-600">
                  Used to deliver relevant advertisements and track their effectiveness.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Managing Cookies</h2>
            <p className="text-gray-600 mb-4">
              Most web browsers allow you to control cookies through their settings preferences. 
              However, limiting cookies may impact your experience using our website.
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-xl font-medium mb-2">How to Control Cookies</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Chrome: Settings → Privacy and Security → Cookies</li>
                <li>Firefox: Options → Privacy & Security → Cookies</li>
                <li>Safari: Preferences → Privacy → Cookies</li>
                <li>Edge: Settings → Privacy & Security → Cookies</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Updates to This Policy</h2>
            <p className="text-gray-600">
              We may update this Cookie Policy from time to time. Any changes will be posted on this page 
              with an updated revision date. Please check back periodically to stay informed about our use of cookies.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Last updated: February 24, 2025
          </p>
          <p className="text-gray-600 mt-2">
            For any questions about our Cookie Policy, please{' '}
            <a href="/contact" className="text-blue-600 hover:text-blue-800">
              contact us
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
