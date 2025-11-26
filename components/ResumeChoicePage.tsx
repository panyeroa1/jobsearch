import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface ResumeChoicePageProps {
  onChoice: (choice: 'upload' | 'build', resumeData?: any) => void;
  onBack: () => void;
}

const ResumeChoicePage: React.FC<ResumeChoicePageProps> = ({ onChoice, onBack }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOCX, or TXT file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // For now, we'll just extract basic text from the file
      // In a production app, you'd use libraries like pdfjs-dist or mammoth for proper parsing
      const text = await file.text();
      
      // Basic extraction - in reality you'd want more sophisticated parsing
      const resumeData = {
        rawText: text,
        fileName: file.name
      };

      // Upload file to Supabase storage for record keeping
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fileExt = file.name.split('.').pop();
        const fileName = `resume_${Date.now()}.${fileExt}`;
        
        await supabase.storage
          .from('resumes')
          .upload(fileName, file);
      }

      onChoice('upload', resumeData);
    } catch (err: any) {
      console.error('File upload error:', err);
      setError('Failed to process file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-4xl relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-3">
            How would you like to proceed?
          </h2>
          <p className="text-gray-400 text-lg">
            Upload your existing resume or build a new one from scratch
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm max-w-2xl mx-auto">
            {error}
          </div>
        )}

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          
          {/* Upload Resume Card */}
          <label className="block cursor-pointer group">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <div className="h-full bg-gray-900/80 backdrop-blur-2xl border-2 border-gray-700 hover:border-emerald-500 rounded-3xl p-8 transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:scale-[1.02] group-hover:bg-gray-900">
              <div className="flex flex-col items-center text-center h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">Upload Resume</h3>
                <p className="text-gray-400 mb-6 flex-1">
                  Have a resume ready? Upload your PDF, DOCX, or TXT file and we'll extract the information for you.
                </p>
                
                <div className="w-full">
                  <div className="px-6 py-3 bg-emerald-600/20 border border-emerald-500/50 rounded-xl text-emerald-400 font-medium group-hover:bg-emerald-600/30 transition-colors">
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      'Click to Upload'
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Supports PDF, DOCX, TXT</p>
                </div>
              </div>
            </div>
          </label>

          {/* Build Resume Card */}
          <button
            onClick={() => onChoice('build')}
            disabled={uploading}
            className="h-full bg-gray-900/80 backdrop-blur-2xl border-2 border-gray-700 hover:border-indigo-500 rounded-3xl p-8 transition-all duration-300 hover:shadow-[0_0_40px_rgba(99,102,241,0.2)] hover:scale-[1.02] hover:bg-gray-900 text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center text-center h-full">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">Build Resume</h3>
              <p className="text-gray-400 mb-6 flex-1">
                Start from scratch with our guided resume builder. Fill in your details step-by-step with our interactive form.
              </p>
              
              <div className="w-full">
                <div className="px-6 py-3 bg-indigo-600/20 border border-indigo-500/50 rounded-xl text-indigo-400 font-medium hover:bg-indigo-600/30 transition-colors">
                  Start Building
                </div>
                <p className="text-xs text-gray-500 mt-3">Complete control & customization</p>
              </div>
            </div>
          </button>

        </div>

        {/* Back Button */}
        <div className="text-center">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeChoicePage;
