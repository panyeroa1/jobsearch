import React, { useState } from 'react';
import { ApplicantData } from '../types';
import { supabase } from '../services/supabase';

interface ApplicantFormProps {
  onSubmit: (data: ApplicantData) => void;
  onBack: () => void;
}

const ApplicantForm: React.FC<ApplicantFormProps> = ({ onSubmit, onBack }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    experience: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate based on mode
    const isValid = isLogin 
      ? formData.email.trim() && formData.password.trim()
      : formData.name.trim() && formData.role.trim() && formData.email.trim() && formData.password.trim() && formData.experience.trim();

    if (isValid) {
      setLoading(true);
      try {
        if (isLogin) {
          // LOGIN MODE
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password.trim(),
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('Login failed');

          // Fetch applicant data from database
          const { data: applicant, error: dbError } = await supabase
            .from('applicants')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

          if (dbError) throw dbError;
          if (!applicant) throw new Error('Applicant record not found');

          // Map to ApplicantData
          const applicantData: ApplicantData = {
            id: applicant.id,
            name: applicant.name || '',
            email: applicant.email || '',
            role: applicant.role || '',
            experience: applicant.experience || '',
            photoUrl: applicant.photo_url,
            phone: applicant.resume_data?.phone,
            address: applicant.resume_data?.address,
            education: applicant.resume_data?.education,
            skills: applicant.resume_data?.skills,
            summary: applicant.resume_data?.summary,
            createdAt: applicant.created_at ? new Date(applicant.created_at).getTime() : Date.now()
          };

          onSubmit(applicantData);
        } else {
          // SIGNUP MODE
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email.trim(),
            password: formData.password.trim(),
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('No user returned from Supabase');

          // Create Applicant Record
          const applicantData = {
            id: crypto.randomUUID(),
            user_id: authData.user.id,
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role.trim(),
            experience: formData.experience.trim(),
            createdAt: Date.now()
          };

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

          onSubmit(applicantData);
        }
      } catch (err: any) {
        console.error(isLogin ? 'Login error:' : 'Signup error:', err);
        setError(err.message || 'An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-2xl bg-gray-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative z-10 animate-fade-in">
        
        <div className="flex justify-between items-start mb-10">
            <div>
                <h2 className="text-4xl font-bold text-white tracking-tight mb-2">
                  {isLogin ? 'Welcome Back' : 'Start Your Journey'}
                </h2>
                <p className="text-gray-400">
                  {isLogin ? 'Log in to continue building your resume.' : 'Tell us about yourself to begin the AI interview process.'}
                </p>
            </div>
            <div className="hidden md:block w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full opacity-80"></div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {!isLogin && (
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    required={!isLogin}
                    className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
                    placeholder="e.g. Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
                    placeholder="e.g. jane@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
            </div>
          )}

          {isLogin && (
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
              <input
                type="email"
                id="email"
                required
                className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
                placeholder="e.g. jane@company.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              id="password"
              required
              minLength={6}
              className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
              placeholder={isLogin ? "Enter your password" : "Create a password (min 6 chars)"}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <label htmlFor="role" className="block text-sm font-medium text-gray-300">Target Position</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <input
                      type="text"
                      id="role"
                      required={!isLogin}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all"
                      placeholder="e.g. Senior Frontend Engineer"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="experience" className="block text-sm font-medium text-gray-300">Experience Summary</label>
                <textarea
                  id="experience"
                  rows={4}
                  required={!isLogin}
                  className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-gray-500 outline-none transition-all resize-none"
                  placeholder="Briefly describe your relevant experience, key skills, and what you're looking for..."
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                />
                <p className="text-xs text-gray-500 text-right">Beatrice will use this to personalize your interview.</p>
              </div>
            </>
          )}

          <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-white text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.01] transition-all duration-200 text-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isLogin ? 'Logging in...' : 'Creating Account...') : (isLogin ? 'Log In' : 'Continue to Resume Builder')}
                {!loading && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {setIsLogin(!isLogin); setError(null);}}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
                </button>
              </div>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
             <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">
                Cancel Application
            </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicantForm;