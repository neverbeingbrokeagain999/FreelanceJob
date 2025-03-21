import React, { useState } from 'react';

const ReportIssue = () => {
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: '',
    email: '',
    attachments: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      attachments: Array.from(e.target.files)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">Report an Issue</h1>
        
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-8">
          {/* Issue Category */}
          <div className="mb-6">
            <label htmlFor="category" className="block text-gray-700 font-semibold mb-2">
              Issue Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a category</option>
              <option value="technical">Technical Issue</option>
              <option value="account">Account Problem</option>
              <option value="payment">Payment Issue</option>
              <option value="security">Security Concern</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <label htmlFor="subject" className="block text-gray-700 font-semibold mb-2">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-gray-700 font-semibold mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Email */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
              Your Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Attachments */}
          <div className="mb-6">
            <label htmlFor="attachments" className="block text-gray-700 font-semibold mb-2">
              Attachments (optional)
            </label>
            <input
              type="file"
              id="attachments"
              name="attachments"
              onChange={handleFileChange}
              multiple
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Submit Report
            </button>
          </div>
        </form>

        {/* Contact Information */}
        <div className="mt-8 text-center text-gray-600">
          <p>For urgent issues, please contact us directly:</p>
          <p className="font-semibold">support@freelancehub.com</p>
          <p className="font-semibold">1-800-FREELANCE</p>
        </div>
      </div>
    </div>
  );
};

export default ReportIssue;
