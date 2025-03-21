import React from 'react';

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">Help Center</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Getting Started */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Creating an Account</a>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Complete Your Profile</a>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Finding Jobs</a>
              </li>
            </ul>
          </div>

          {/* Account & Settings */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Account & Settings</h2>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Account Settings</a>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Payment Methods</a>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Security Settings</a>
              </li>
            </ul>
          </div>

          {/* Billing & Payments */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Billing & Payments</h2>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Payment Methods</a>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Invoices</a>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:text-blue-800">Refund Policy</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Need More Help?</h2>
          <p className="text-gray-600 mb-4">Our support team is available 24/7 to assist you</p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
