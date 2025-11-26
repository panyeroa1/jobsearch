import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import './AuthPage.css';

interface AuthPageProps {
  userType: 'applicant' | 'employer';
  onSuccess: (userId: string) => void;
  onBack: () => void;
}

type AuthMode = 'signup' | 'login' | 'reset';

const AuthPage: React.FC<AuthPageProps> = ({ userType, onSuccess, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    experience: '',
    companyName: '',
    industry: '',
    website: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'reset') {
        // Password Reset
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`
        });
        
        if (error) throw error;
        setResetSent(true);
      } else if (mode === 'login') {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password.trim(),
        });

        if (error) throw error;
        if (!data.user) throw new Error('Login failed');

        onSuccess(data.user.id);
      } else {
        // Signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password.trim(),
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Signup failed');

        // Create record in appropriate table
        if (userType === 'applicant') {
          const { error: dbError } = await supabase
            .from('applicants')
            .insert([{
              user_id: authData.user.id,
              name: formData.name.trim(),
              email: formData.email.trim(),
              role: formData.role.trim(),
              experience: formData.experience.trim()
            }]);
          if (dbError) throw dbError;
        } else {
          // Employer Signup
          const { error: dbError } = await supabase
            .from('employers')
            .insert([{
              user_id: authData.user.id,
              company_name: formData.companyName.trim(),
              industry: formData.industry.trim(),
              website: formData.website.trim()
            }]);
          if (dbError) throw dbError;
        }

        onSuccess(authData.user.id);
      }
    } catch (err: any) {
      console.error(`${mode} error:`, err);
      // Better error message for network issues
      if (err.message === 'Failed to fetch') {
        setError('Connection failed. Please check your internet connection or firewall settings.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isEmployer = userType === 'employer';

  return (
    <section className="fxt-template-animation fxt-template-layout33 loaded">
      <div className="fxt-content-wrap">
        <div className="fxt-heading-content">
          <div className="fxt-inner-wrap fxt-transformX-R-50 fxt-transition-delay-3">
            <div className="fxt-transformX-R-50 fxt-transition-delay-10">
              <div className="fxt-logo">
                <h1 className="text-4xl font-bold text-white tracking-tighter">Match-It</h1>
              </div>
            </div>
            <div className="fxt-transformX-R-50 fxt-transition-delay-10">
              <div className="fxt-middle-content">
                <div className="fxt-sub-title">Welcome to {isEmployer ? 'Employer Portal' : 'Applicant Portal'}</div>
                <h1 className="fxt-main-title">{isEmployer ? 'Hire Top Talent.' : 'Find Your Dream Job.'}</h1>
                <p className="fxt-description">
                  {isEmployer 
                    ? 'Connect with the best candidates and streamline your hiring process.' 
                    : 'Experience the future of interviewing with our AI-powered platform.'}
                </p>
              </div>
            </div>
            <div className="fxt-transformX-R-50 fxt-transition-delay-10">
              <div className="fxt-switcher-description">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button 
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError(null);
                    setResetSent(false);
                  }}
                  className="fxt-switcher-text ml-2"
                >
                  {mode === 'login' ? 'Register' : 'Log In'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="fxt-form-content">
          <div className="fxt-main-form">
            <div className="fxt-inner-wrap fxt-opacity fxt-transition-delay-13">
              <h2 className="fxt-page-title">
                {mode === 'reset' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Log In'}
              </h2>
              <p className="fxt-description">
                {mode === 'reset' ? 'Enter your email to receive a reset link' : mode === 'signup' ? 'Sign up to get started' : 'Log in to continue'}
              </p>
              
              {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {resetSent && (
                <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                  Password reset email sent! Check your inbox.
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Signup Fields */}
                {mode === 'signup' && (
                  <>
                    {isEmployer ? (
                      // Employer Fields
                      <>
                        <div className="form-group">
                          <label htmlFor="companyName" className="fxt-label">Company Name</label>
                          <input
                            type="text"
                            id="companyName"
                            className="form-control"
                            placeholder="e.g. Acme Corp"
                            required
                            value={formData.companyName}
                            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="industry" className="fxt-label">Industry</label>
                          <input
                            type="text"
                            id="industry"
                            className="form-control"
                            placeholder="e.g. Technology"
                            required
                            value={formData.industry}
                            onChange={(e) => setFormData({...formData, industry: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="website" className="fxt-label">Website (Optional)</label>
                          <input
                            type="url"
                            id="website"
                            className="form-control"
                            placeholder="https://example.com"
                            value={formData.website}
                            onChange={(e) => setFormData({...formData, website: e.target.value})}
                          />
                        </div>
                      </>
                    ) : (
                      // Applicant Fields
                      <>
                        <div className="form-group">
                          <label htmlFor="name" className="fxt-label">Full Name</label>
                          <input
                            type="text"
                            id="name"
                            className="form-control"
                            placeholder="e.g. Jane Doe"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="role" className="fxt-label">Target Position</label>
                          <input
                            type="text"
                            id="role"
                            className="form-control"
                            placeholder="e.g. Senior Frontend Engineer"
                            required
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="experience" className="fxt-label">Brief Experience</label>
                          <textarea
                            id="experience"
                            rows={3}
                            className="form-control"
                            placeholder="Key skills and experience..."
                            required
                            value={formData.experience}
                            onChange={(e) => setFormData({...formData, experience: e.target.value})}
                            style={{ height: 'auto', minHeight: '80px' }}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="email" className="fxt-label">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    className="form-control"
                    placeholder="Enter your email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                {mode !== 'reset' && (
                  <div className="form-group">
                    <label htmlFor="password" className="fxt-label">Password</label>
                    <input
                      id="password"
                      type="password"
                      className="form-control"
                      placeholder="Enter Password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="form-group">
                    <button 
                      type="button" 
                      onClick={() => setMode('reset')}
                      className="fxt-switcher-text"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <div className="form-group mb-3">
                  <button type="submit" className="fxt-btn-fill" disabled={loading}>
                    {loading ? 'Please wait...' : (mode === 'reset' ? 'Send Reset Link' : mode === 'signup' ? 'Register' : 'Log in')}
                  </button>
                </div>
              </form>
              
              <div className="fxt-divider-text mt-8">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm">
                  ← Back to Role Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthPage;
