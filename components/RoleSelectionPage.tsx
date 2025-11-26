import React from 'react';

interface RoleSelectionPageProps {
  onSelect: (role: 'applicant' | 'employer') => void;
  onBack: () => void;
}

const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({ onSelect, onBack }) => {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-4xl relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-3">
            Choose your path
          </h2>
          <p className="text-gray-400 text-lg">
            Are you looking for a job or looking to hire?
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          
          {/* Applicant Card */}
          <button
            onClick={() => onSelect('applicant')}
            className="group h-full bg-gray-900/80 backdrop-blur-2xl border-2 border-gray-700 hover:border-blue-500 rounded-3xl p-8 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] hover:scale-[1.02] hover:bg-gray-900 text-left"
          >
            <div className="flex flex-col items-center text-center h-full">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">I'm an Applicant</h3>
              <p className="text-gray-400 mb-6 flex-1">
                Build your resume, practice interviews with AI, and find your dream job.
              </p>
              
              <div className="w-full px-6 py-3 bg-blue-600/20 border border-blue-500/50 rounded-xl text-blue-400 font-medium group-hover:bg-blue-600/30 transition-colors">
                Find a Job
              </div>
            </div>
          </button>

          {/* Employer Card */}
          <button
            onClick={() => onSelect('employer')}
            className="group h-full bg-gray-900/80 backdrop-blur-2xl border-2 border-gray-700 hover:border-purple-500 rounded-3xl p-8 transition-all duration-300 hover:shadow-[0_0_40px_rgba(147,51,234,0.2)] hover:scale-[1.02] hover:bg-gray-900 text-left"
          >
            <div className="flex flex-col items-center text-center h-full">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">I'm an Employer</h3>
              <p className="text-gray-400 mb-6 flex-1">
                Post jobs, manage listings, and find the best talent for your company.
              </p>
              
              <div className="w-full px-6 py-3 bg-purple-600/20 border border-purple-500/50 rounded-xl text-purple-400 font-medium group-hover:bg-purple-600/30 transition-colors">
                Hire Talent
              </div>
            </div>
          </button>

        </div>

        {/* Back Button */}
        <div className="text-center">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
