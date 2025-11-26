import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface AuthPageProps {
  onSuccess: (userId: string) => void;
  onBack: () => void;
}

type AuthMode = 'signup' | 'login' | 'reset';

const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    experience: ''
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

        // Create applicant record
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

        onSuccess(authData.user.id);
      }
    } catch (err: any) {
      console.error(`${mode} error:`, err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: AuthMode; label: string }[] = [
    { id: 'login', label: 'Log In' },
    { id: 'signup', label: 'Sign Up' },
    { id: 'reset', label: 'Reset' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
            {mode === 'reset' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400 text-sm">
            {mode === 'reset' ? 'Enter your email to receive a reset link' : mode === 'signup' ? 'Sign up to start your AI interview' : 'Log in to continue'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800/50 rounded-xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMode(tab.id);
                setError(null);
                setResetSent(false);
              }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === tab.id
                  ? 'bg-white text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {resetSent && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-emerald-400 text-sm">
            Password reset email sent! Check your inbox.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Signup Fields */}
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                <input
                  type="text"
                  id="name"
                  required
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="role" className="block text-sm font-medium text-gray-300">Target Position</label>
                <input
                  type="text"
                  id="role"
                  required
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="experience" className="block text-sm font-medium text-gray-300">Brief Experience</label>
                <textarea
                  id="experience"
                  rows={3}
                  required
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all resize-none"
                  placeholder="Key skills and experience..."
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                />
              </div>
            </>
          )}

          {/* Email Field (all modes) */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
            <input
              type="email"
              id="email"
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          {/* Password Field (login & signup) */}
          {mode !== 'reset' && (
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
              <input
                type="password"
                id="password"
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
                placeholder={mode === 'signup' ? 'Create password (min 6 chars)' : 'Enter your password'}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-white text-black font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                {mode === 'reset' ? 'Sending...' : mode === 'signup' ? 'Creating Account...' : 'Logging in...'}
              </>
            ) : (
              <>
                {mode === 'reset' ? 'Send Reset Link' : mode === 'signup' ? 'Create Account' : 'Log In'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </>
            )}
          </button>
        </form>

        {/* Back Button */}
        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
