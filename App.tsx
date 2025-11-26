import React, { useState, useEffect } from 'react';
import InterviewSession from './components/InterviewSession';
import ApplicantForm from './components/ApplicantForm';
import LandingPage from './components/LandingPage';
import AdminLogin from './components/AdminLogin';
import AdminPortal from './components/AdminPortal';
import ResumeBuilder from './components/ResumeBuilder';
import AuthPage from './components/AuthPage';
import ResumeChoicePage from './components/ResumeChoicePage';
import RoleSelectionPage from './components/RoleSelectionPage';
import EmployerDashboard from './components/EmployerDashboard';
import { AVATAR_URL, VOICE_OPTIONS } from './constants';
import { ApplicantData, AppStep } from './types';
import { supabase } from './services/supabase';

function App() {
  const [step, setStep] = useState<AppStep>('landing');
  const [applicantData, setApplicantData] = useState<ApplicantData | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Aoede');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userType, setUserType] = useState<'applicant' | 'employer'>('applicant');

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if user is an applicant
          const { data: applicant, error: applicantError } = await supabase
            .from('applicants')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (applicant && !applicantError) {
            // It's an applicant
            setUserType('applicant');
            const mappedData: ApplicantData = {
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

            setApplicantData(mappedData);

            // Route based on resume completion
            const isResumeComplete = applicant.photo_url && applicant.resume_data;
            setStep(isResumeComplete ? 'interview' : 'resume-choice');
          } else {
            // Check if user is an employer
            const { data: employer, error: employerError } = await supabase
              .from('employers')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            if (employer && !employerError) {
              setUserType('employer');
              setStep('employer-dashboard');
            }
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setApplicantData(null);
        setStep('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = async (userId: string) => {
    if (userType === 'employer') {
      setStep('employer-dashboard');
      return;
    }

    // Fetch applicant data after auth
    try {
      const { data: applicant, error } = await supabase
        .from('applicants')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (applicant && !error) {
        const mappedData: ApplicantData = {
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
        setApplicantData(mappedData);
      }
    } catch (error) {
      console.error('Error fetching applicant:', error);
    }
    setStep('resume-choice');
  };

  const handleResumeChoice = async (choice: 'upload' | 'build', resumeData?: any) => {
    if (choice === 'upload' && resumeData && applicantData) {
      let photoUrl = applicantData.photoUrl;

      // Upload photo if extracted from PDF
      if (resumeData.photoBlob) {
        try {
          const fileName = `avatar_${applicantData.id}_${Date.now()}.jpg`;
          const { error } = await supabase.storage
            .from('resumes')
            .upload(fileName, resumeData.photoBlob);
          
          if (!error) {
            const { data } = supabase.storage
              .from('resumes')
              .getPublicUrl(fileName);
            photoUrl = data.publicUrl;
          }
        } catch (e) {
          console.error('Error uploading extracted photo:', e);
        }
      }

      // Merge AI parsed data with existing applicant data
      const updatedData: ApplicantData = {
        ...applicantData,
        name: resumeData.name || applicantData.name,
        email: resumeData.email || applicantData.email,
        role: resumeData.role || applicantData.role,
        experience: resumeData.experience || applicantData.experience,
        phone: resumeData.phone || applicantData.phone,
        address: resumeData.location || applicantData.address,
        summary: resumeData.summary || applicantData.summary,
        skills: resumeData.skills || applicantData.skills,
        education: resumeData.education || applicantData.education,
        photoUrl: photoUrl
      };

      setApplicantData(updatedData);
    }
    setStep('resume-builder');
  };

  const handleResumeComplete = (data: ApplicantData) => {
    setApplicantData(data);
    setStep('interview'); // Transition to Interview
  };

  const startCall = async () => {
    try {
        if ((window as any).aistudio) {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await (window as any).aistudio.openSelectKey();
            }
        }
    } catch (e) {
        console.error("API Key flow error:", e);
    }

    try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setHasPermissions(true);
    } catch (e) {
        console.error("Media permission error:", e);
        alert("Camera and Microphone permissions are required. Please reset permissions for this site and try again.");
    }
  };

  const handleEndCall = () => {
    setStep('thank-you');
  };

  const handleStartOver = () => {
    setApplicantData(null);
    setHasPermissions(false);
    setSelectedVoice('Aoede');
    setStep('landing');
  };

  // --- ROUTING ---

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (step === 'landing') {
      return (
          <LandingPage 
            onFindJob={() => setStep('role-selection')}
            onAdminLogin={() => setStep('login')}
          />
      );
  }

  if (step === 'role-selection') {
    return (
      <RoleSelectionPage 
        onSelect={(role) => {
          setUserType(role);
          setStep('auth');
        }}
        onBack={() => setStep('landing')}
      />
    );
  }

  if (step === 'login') {
      return (
          <AdminLogin 
            onSuccess={() => setStep('admin')}
            onBack={() => setStep('landing')}
          />
      );
  }

  if (step === 'admin') {
      return (
          <AdminPortal 
            onLogout={() => setStep('landing')}
          />
      );
  }

  if (step === 'auth') {
    return (
      <AuthPage 
        userType={userType}
        onSuccess={handleAuthSuccess} 
        onBack={() => setStep('role-selection')} 
      />
    );
  }

  if (step === 'employer-dashboard') {
    return (
      <EmployerDashboard 
        onLogout={() => setStep('landing')}
      />
    );
  }

  if (step === 'resume-choice' && applicantData) {
    return <ResumeChoicePage onChoice={handleResumeChoice} onBack={() => setStep('auth')} />;
  }

  if (step === 'applicant-form') {
    // This is now deprecated/optional - keeping for backwards compat if needed
    return null;
  }

  if (step === 'resume-builder' && applicantData) {
      return (
          <ResumeBuilder 
            applicantData={applicantData}
            onNext={handleResumeComplete}
            onBack={() => setStep('applicant-form')}
          />
      );
  }

  // Interview Pre-check
  if (step === 'interview' && !hasPermissions) {
      return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32 mb-6">
                        <img 
                            src={AVATAR_URL}
                            alt="Beatrice" 
                            className="w-full h-full rounded-full object-cover border-4 border-gray-700 shadow-xl"
                        />
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-800" title="Online"></div>
                    </div>
                    
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Hello, {applicantData?.name.split(' ')[0]}
                    </h1>
                    <p className="mt-2 text-gray-400">
                        Customize your interview experience for the <strong>{applicantData?.role}</strong> position.
                    </p>
                </div>

                <div className="bg-gray-800 rounded-2xl p-6 text-left shadow-lg border border-gray-700">
                    <h3 className="text-white font-medium mb-4">Interview Settings</h3>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Select Interviewer Voice</label>
                        <div className="space-y-2">
                            {VOICE_OPTIONS.map((voice) => (
                                <button
                                    key={voice.id}
                                    onClick={() => setSelectedVoice(voice.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                        selectedVoice === voice.id 
                                        ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                                        : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                                    }`}
                                >
                                    <span className="font-medium">{voice.name}</span>
                                    {selectedVoice === voice.id && (
                                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-start space-x-4 mb-4 pt-4 border-t border-gray-700">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Duration</h3>
                            <p className="text-gray-400 text-sm">Approx. 30-45 minutes</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <button 
                        onClick={startCall}
                        className="w-full group relative flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/30"
                    >
                        Join Interview Room
                    </button>
                    <button 
                        onClick={handleStartOver}
                        className="text-sm text-gray-500 hover:text-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )
  }

  // Active Interview
  if (step === 'interview' && hasPermissions && applicantData) {
    return (
        <div className="h-screen w-screen overflow-hidden">
            <InterviewSession 
                onEndCall={handleEndCall} 
                applicantData={applicantData} 
                voiceName={selectedVoice}
            />
        </div>
    );
  }

  if (step === 'thank-you') {
      return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 text-center text-white">
              <div className="max-w-lg space-y-6">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-3xl font-bold">Interview Complete</h2>
                  <p className="text-gray-400 text-lg">Thank you, {applicantData?.name}. Beatrice has submitted your evaluation to the hiring team.</p>
                  <p className="text-gray-500">You will hear from us within 48 hours.</p>
                  <button onClick={handleStartOver} className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-full font-medium transition-colors">
                      Back to Home
                  </button>
              </div>
          </div>
      )
  }

  return null;
}

export default App;