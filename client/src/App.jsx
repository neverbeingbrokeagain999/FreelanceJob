import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

// Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import About from './pages/About';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import HowItWorks from './pages/HowItWorks';
import Enterprise from './pages/Enterprise';
import PartnerProgram from './pages/PartnerProgram';
import ApiDocs from './pages/ApiDocs';
import Careers from './pages/Careers';
import Blog from './pages/Blog';
import Press from './pages/Press';
import HelpCenter from './pages/HelpCenter';
import TrustAndSafety from './pages/TrustAndSafety';
import ReportIssue from './pages/ReportIssue';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import CookiePolicy from './pages/CookiePolicy';

// Protected Pages
import ProtectedRoute from './components/ProtectedRoute';

// Client Pages
import ClientDashboard from './pages/ClientDashboard';
import PostJob from './pages/PostJob';
import JobDetails from './pages/JobDetails';

// Freelancer Pages
import FreelancerDashboard from './pages/FreelancerDashboard';
import FreelancerProfile from './pages/FreelancerProfile';
import BrowseJobs from './pages/BrowseJobs';
import ActiveJobs from './pages/ActiveJobs';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminJobs from './pages/admin/AdminJobs';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminVerifyProfiles from './pages/admin/AdminVerifyProfiles';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

// Common Protected Pages
import Settings from './pages/Settings';
import DirectMessages from './pages/DirectMessages';
import Notifications from './pages/Notifications';
import TransactionHistory from './pages/TransactionHistory';
import PaymentMethods from './pages/PaymentMethods';
import Meetings from './pages/Meetings';
import Documents from './pages/Documents';
import DirectContracts from './pages/DirectContracts';

// Settings Pages
import TwoFactorSettings from './pages/settings/TwoFactorSettings';
import CompanySettings from './pages/CompanySettings';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/about" element={<About />} />
                <Route path="/features" element={<Features />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/enterprise" element={<Enterprise />} />
                <Route path="/partner-program" element={<PartnerProgram />} />
                <Route path="/api-docs" element={<ApiDocs />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/press" element={<Press />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/trust" element={<TrustAndSafety />} />
                <Route path="/report" element={<ReportIssue />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<CookiePolicy />} />

                {/* Protected Client Routes */}
                <Route element={<ProtectedRoute requiredRole="client" />}>
                  <Route path="/client/dashboard" element={<ClientDashboard />} />
                  <Route path="/post-job" element={<PostJob />} />
                  <Route path="/jobs" element={<JobDetails />} />
                  <Route path="/jobs/:jobId" element={<JobDetails />} />
                </Route>

                {/* Protected Freelancer Routes */}
                <Route element={<ProtectedRoute requiredRole="freelancer" />}>
                  <Route path="/freelancer/dashboard" element={<FreelancerDashboard />} />
                  <Route path="/profile" element={<FreelancerProfile />} />
                  <Route path="/browse-jobs" element={<BrowseJobs />} />
                  <Route path="/active-jobs" element={<ActiveJobs />} />
                </Route>

                {/* Protected Admin Routes */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/jobs" element={<AdminJobs />} />
                  <Route path="/admin/disputes" element={<AdminDisputes />} />
                  <Route path="/admin/verify-profiles" element={<AdminVerifyProfiles />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                </Route>

                {/* Common Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/2fa" element={<TwoFactorSettings />} />
                  <Route path="/settings/company" element={<CompanySettings />} />
                  <Route path="/messages" element={<DirectMessages />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/transactions" element={<TransactionHistory />} />
                  <Route path="/payment-methods" element={<PaymentMethods />} />
                  <Route path="/meetings" element={<Meetings />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/contracts" element={<DirectContracts />} />
                </Route>

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster position="top-right" />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
