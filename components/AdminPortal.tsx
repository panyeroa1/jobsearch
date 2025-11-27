
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ApplicantData, InterviewReport, JobPosting } from '../types';

interface AdminPortalProps {
  onLogout: () => void;
}

type ViewMode = 'interviews' | 'jobs';

const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  const [view, setView] = useState<ViewMode>('interviews');
  
  // Data States
  const [reports, setReports] = useState<(InterviewReport & { applicant: ApplicantData })[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  
  // Selection States
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  // Job Form State
  const [newJob, setNewJob] = useState<Partial<JobPosting>>({
    title: '',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salaryRange: '',
    description: '',
    requirements: []
  });
  const [reqInput, setReqInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Load Interviews
    const savedReports = localStorage.getItem('interview_reports');
    const savedApplicants = localStorage.getItem('applicants');

    if (savedReports && savedApplicants) {
        const parsedReports: InterviewReport[] = JSON.parse(savedReports);
        const parsedApplicants: ApplicantData[] = JSON.parse(savedApplicants);
        const joined = parsedReports.map(r => {
            const app = parsedApplicants.find(a => a.id === r.applicantId);
            return app ? { ...r, applicant: app } : null;
        }).filter(Boolean) as (InterviewReport & { applicant: ApplicantData })[];
        setReports(joined.reverse());
    }

    // Load Jobs
    const savedJobs = localStorage.getItem('eburon_jobs');
    if (savedJobs) {
        setJobs(JSON.parse(savedJobs));
    } else {
        // Default Mock Jobs
        const defaults: JobPosting[] = [
            {
                id: '1',
                title: 'Senior AI Engineer',
                department: 'Engineering',
                location: 'Brussels (Hybrid)',
                type: 'Full-time',
                salaryRange: '€80k - €120k',
                description: 'We are looking for a visionary AI engineer to lead our Gemini integration projects.',
                requirements: ['5+ years Python', 'Experience with LLMs', 'TypeScript knowledge'],
                status: 'Active',
                postedAt: Date.now()
            }
        ];
        setJobs(defaults);
        localStorage.setItem('eburon_jobs', JSON.stringify(defaults));
    }
  }, []);

  const handleSaveJob = () => {
      if (!newJob.title || !newJob.description) return;

      const job: JobPosting = {
          id: crypto.randomUUID(),
          title: newJob.title!,
          department: newJob.department || 'General',
          location: newJob.location || 'Remote',
          type: (newJob.type as any) || 'Full-time',
          salaryRange: newJob.salaryRange || 'Competitive',
          description: newJob.description!,
          requirements: newJob.requirements || [],
          status: 'Active',
          postedAt: Date.now()
      };

      const updatedJobs = [job, ...jobs];
      setJobs(updatedJobs);
      localStorage.setItem('eburon_jobs', JSON.stringify(updatedJobs));
      setIsCreatingJob(false);
      setNewJob({ title: '', department: '', location: '', description: '', requirements: [] });
      setReqInput('');
      setSelectedJobId(job.id);
  };

  const handleDeleteJob = (id: string) => {
      const updated = jobs.filter(j => j.id !== id);
      setJobs(updated);
      localStorage.setItem('eburon_jobs', JSON.stringify(updated));
      if (selectedJobId === id) setSelectedJobId(null);
  };

  const handleStatusChange = (id: string, newStatus: JobPosting['status']) => {
      const updated = jobs.map(j => j.id === id ? { ...j, status: newStatus } : j);
      setJobs(updated);
      localStorage.setItem('eburon_jobs', JSON.stringify(updated));
  };

  const handleAddRequirement = () => {
    if (reqInput.trim()) {
        setNewJob({
            ...newJob,
            requirements: [...(newJob.requirements || []), reqInput.trim()]
        });
        setReqInput('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    const updated = [...(newJob.requirements || [])];
    updated.splice(index, 1);
    setNewJob({ ...newJob, requirements: updated });
  };

  const handleAiGenerateJob = async () => {
    if (!newJob.title) return;
    setIsGenerating(true);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Write a professional, exciting job description for a "${newJob.title}" role at Eburon, a cutting-edge AI company. 
        Department: ${newJob.department}. 
        Format: JSON with fields: description (string), requirements (array of strings), recommendedSalaryRange (string).`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const data = JSON.parse(response.text || '{}');
        setNewJob(prev => ({
            ...prev,
            description: data.description,
            requirements: data.requirements,
            salaryRange: prev.salaryRange || data.recommendedSalaryRange
        }));
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const getStatusConfig = (status: string) => {
      switch (status) {
          case 'Active': return {
              classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              icon: <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>,
              labelColor: 'text-emerald-400'
          };
          case 'Draft': return {
              classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              icon: <div className="w-2 h-2 rounded-full bg-amber-500"></div>,
              labelColor: 'text-amber-400'
          };
          case 'Closed': return {
              classes: 'bg-gray-700/50 text-gray-400 border-gray-600/30',
              icon: <div className="w-2 h-2 rounded-full bg-gray-500"></div>,
              labelColor: 'text-gray-500'
          };
          default: return {
              classes: 'bg-gray-800 text-gray-400',
              icon: <div className="w-2 h-2 rounded-full bg-gray-500"></div>,
              labelColor: 'text-gray-400'
          };
      }
  };

  const selectedReport = reports.find(r => r.applicantId === selectedReportId);
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Helper to determine if we should show the list on mobile
  const showList = !((view === 'jobs' && (selectedJobId || isCreatingJob)) || (view === 'interviews' && selectedReportId));

  return (
    <div className="h-screen overflow-hidden bg-gray-950 text-white flex font-sans selection:bg-emerald-500/30">
      
      {/* 1. Main Navigation Sidebar (Narrow) */}
      <div className="w-16 md:w-20 bg-black border-r border-gray-800 flex flex-col items-center py-6 z-30 flex-shrink-0 shadow-xl">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 mb-8 shadow-lg shadow-emerald-500/20 flex items-center justify-center font-bold text-black text-lg">M</div>
        
        <div className="flex flex-col gap-6 w-full px-2">
            <button 
                onClick={() => { setView('interviews'); setSelectedReportId(null); }}
                className={`w-full aspect-square flex items-center justify-center rounded-xl transition-all duration-200 group relative ${view === 'interviews' ? 'bg-gray-800 text-emerald-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}
                title="Interviews"
            >
                {view === 'interviews' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full"></div>}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </button>
            
            <button 
                onClick={() => { setView('jobs'); setSelectedJobId(null); setIsCreatingJob(false); }}
                className={`w-full aspect-square flex items-center justify-center rounded-xl transition-all duration-200 group relative ${view === 'jobs' ? 'bg-gray-800 text-emerald-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}
                title="Job Board"
            >
                {view === 'jobs' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full"></div>}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </button>
        </div>

        <div className="mt-auto px-2 w-full">
            <button 
                onClick={onLogout}
                className="w-full aspect-square flex items-center justify-center rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Logout"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
        </div>
      </div>

      {/* 2. List Sidebar (Responsive) */}
      <div className={`${showList ? 'flex' : 'hidden md:flex'} w-full md:w-80 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 flex-col h-full flex-shrink-0 transition-all z-20 absolute md:relative`}>
        <div className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-white">
                {view === 'interviews' ? 'Candidates' : 'Jobs'}
            </h1>
            {view === 'jobs' && (
                <button 
                    onClick={() => { setIsCreatingJob(true); setSelectedJobId(null); }}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-all shadow-lg shadow-emerald-500/20 transform hover:scale-105"
                    title="Create New Job"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            )}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {view === 'interviews' ? (
                reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm italic p-6 text-center">
                        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        No interviews recorded yet.
                    </div>
                ) : (
                    reports.map(report => (
                        <button 
                            key={report.applicantId}
                            onClick={() => setSelectedReportId(report.applicantId)}
                            className={`w-full text-left p-4 border-b border-gray-800 hover:bg-gray-800 transition-all group ${selectedReportId === report.applicantId ? 'bg-gray-800 border-l-4 border-l-emerald-500 pl-3' : 'border-l-4 border-l-transparent pl-3'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className={`font-semibold text-sm transition-colors ${selectedReportId === report.applicantId ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{report.applicant.name}</div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                    report.recommendation === 'HIRE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    report.recommendation === 'PASS' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                }`}>
                                    {report.recommendation}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">{report.applicant.role}</div>
                            <div className="text-[10px] text-gray-600 mt-2">
                                {new Date(report.applicant.timestamp).toLocaleDateString()}
                            </div>
                        </button>
                    ))
                )
            ) : (
                jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm italic p-6 text-center">
                         <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        No job postings found.
                    </div>
                ) : (
                    jobs.map(job => {
                        const statusConfig = getStatusConfig(job.status);
                        return (
                            <button 
                                key={job.id}
                                onClick={() => { setSelectedJobId(job.id); setIsCreatingJob(false); }}
                                className={`w-full text-left p-4 border-b border-gray-800 transition-all group relative overflow-hidden ${
                                    selectedJobId === job.id && !isCreatingJob ? 'bg-gray-800' : 'hover:bg-gray-900/50'
                                } ${job.status === 'Closed' ? 'opacity-70 bg-gray-900/30' : ''}`}
                            >
                                {selectedJobId === job.id && !isCreatingJob && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                )}
                                
                                <div className="flex justify-between items-start mb-1 pl-1">
                                    <div className={`font-semibold text-sm transition-colors pr-2 ${selectedJobId === job.id ? 'text-white' : 'text-gray-300 group-hover:text-white'} ${job.status === 'Closed' ? 'line-through decoration-gray-600' : ''}`}>
                                        {job.title}
                                    </div>
                                    {/* Status Dot */}
                                    <div className="mt-1">{statusConfig.icon}</div>
                                </div>
                                
                                <div className="text-xs text-gray-500 pl-1 mt-0.5 flex items-center gap-1 truncate">
                                    {job.location}
                                </div>
                                <div className="mt-2 pl-1 flex gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md border ${statusConfig.classes} bg-opacity-10 border-opacity-20`}>
                                        {job.status}
                                    </span>
                                    <span className="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                                        {job.department}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )
            )}
        </div>
      </div>

      {/* 3. Content Area */}
      <div className={`${!showList ? 'flex' : 'hidden md:flex'} flex-1 bg-gray-950 overflow-y-auto p-4 md:p-8 relative min-w-0 flex-col`}>
        {/* Abstract Background */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-gray-900 to-transparent pointer-events-none"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        {/* Mobile Back Button */}
        {!showList && (
            <button 
                onClick={() => { setSelectedJobId(null); setSelectedReportId(null); setIsCreatingJob(false); }}
                className="md:hidden mb-4 flex items-center text-gray-400 hover:text-white transition-colors self-start"
            >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to List
            </button>
        )}

        <div className="relative z-10 max-w-5xl mx-auto w-full">
            {view === 'interviews' && (
                selectedReport ? (
                    <div className="space-y-6 animate-fade-in pb-10">
                        {/* Interview Report Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 bg-gray-900/50 backdrop-blur-md border border-gray-800 p-6 rounded-2xl shadow-xl">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{selectedReport.applicant.name}</h2>
                                <p className="text-lg text-emerald-400 mt-1 font-medium">{selectedReport.applicant.role}</p>
                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                                    <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> {selectedReport.applicant.email}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                    <span>{new Date(selectedReport.applicant.timestamp).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-gray-950 border border-gray-800 p-4 rounded-xl shadow-inner min-w-[120px]">
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Fit Score</div>
                                <div className={`text-4xl font-black ${
                                    selectedReport.score >= 80 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' :
                                    selectedReport.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {selectedReport.score}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-lg">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                        AI Executive Summary
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed font-light text-base">
                                        {selectedReport.summary}
                                    </p>
                                </div>
                                
                                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col max-h-[600px]">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 sticky top-0 bg-gray-900/50 backdrop-blur-sm py-2">Transcript</h3>
                                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                        {selectedReport.transcript.map((t, i) => (
                                            <div key={i} className={`flex ${t.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-md border ${
                                                    t.role === 'model' 
                                                    ? 'bg-gray-800 border-gray-700 text-gray-300 rounded-tl-none' 
                                                    : 'bg-indigo-900/30 border-indigo-500/20 text-indigo-100 rounded-tr-none'
                                                }`}>
                                                    <div className={`text-[10px] uppercase tracking-wider mb-1 font-bold ${t.role === 'model' ? 'text-gray-500' : 'text-indigo-400'}`}>
                                                        {t.role === 'model' ? 'Beatrice (AI)' : 'Candidate'}
                                                    </div>
                                                    {t.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                 <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-lg">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Evaluation</h3>
                                    
                                    <div className="mb-8">
                                        <h4 className="flex items-center gap-2 text-emerald-400 font-bold mb-3 text-sm uppercase tracking-wide">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Key Strengths
                                        </h4>
                                        <ul className="space-y-3">
                                            {selectedReport.strengths.map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm group">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/50 group-hover:bg-emerald-400 transition-colors flex-shrink-0"></span>
                                                    <span className="leading-snug">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="flex items-center gap-2 text-red-400 font-bold mb-3 text-sm uppercase tracking-wide">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Areas of Concern
                                        </h4>
                                        <ul className="space-y-3">
                                            {selectedReport.weaknesses.map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm group">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/50 group-hover:bg-red-400 transition-colors flex-shrink-0"></span>
                                                    <span className="leading-snug">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                 </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-[70vh] flex flex-col items-center justify-center text-gray-600">
                        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800 shadow-xl">
                            <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <p className="text-lg font-medium text-gray-500">Select a candidate to view their AI report</p>
                    </div>
                )
            )}

            {view === 'jobs' && (
                isCreatingJob ? (
                    // --- JOB CREATION FORM ---
                    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-white tracking-tight">Post a Job</h2>
                                <p className="text-gray-400 mt-1">Create a new opportunity at Eburon.</p>
                            </div>
                            <button onClick={() => setIsCreatingJob(false)} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">Cancel</button>
                        </div>

                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Job Title</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder-gray-600"
                                            placeholder="e.g. Senior Product Designer"
                                            value={newJob.title}
                                            onChange={e => setNewJob({...newJob, title: e.target.value})}
                                        />
                                        <button 
                                            onClick={handleAiGenerateJob}
                                            disabled={isGenerating || !newJob.title}
                                            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 md:px-6 py-2 rounded-xl font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                        >
                                            {isGenerating ? (
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            )}
                                            <span className="hidden md:inline">AI Generate</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Department</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-600"
                                        value={newJob.department}
                                        onChange={e => setNewJob({...newJob, department: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Location</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-600"
                                        value={newJob.location}
                                        onChange={e => setNewJob({...newJob, location: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none"
                                            value={newJob.type}
                                            onChange={e => setNewJob({...newJob, type: e.target.value as any})}
                                        >
                                            <option>Full-time</option>
                                            <option>Part-time</option>
                                            <option>Contract</option>
                                            <option>Remote</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Salary Range</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-600"
                                        placeholder="e.g. €60k - €80k"
                                        value={newJob.salaryRange}
                                        onChange={e => setNewJob({...newJob, salaryRange: e.target.value})}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                                    <textarea 
                                        rows={8}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none transition-all placeholder-gray-600 leading-relaxed"
                                        value={newJob.description}
                                        onChange={e => setNewJob({...newJob, description: e.target.value})}
                                        placeholder="Enter full job description..."
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Requirements</label>
                                    <div className="space-y-3">
                                        {newJob.requirements?.map((req, index) => (
                                            <div key={index} className="flex items-center gap-3 bg-gray-950 p-3 rounded-xl border border-gray-800 group hover:border-gray-700 transition-colors">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                <span className="text-gray-300 text-sm flex-1">{req}</span>
                                                <button 
                                                    onClick={() => handleRemoveRequirement(index)} 
                                                    className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Remove requirement"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none placeholder-gray-600"
                                                placeholder="Add a key requirement..."
                                                value={reqInput}
                                                onChange={(e) => setReqInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRequirement())}
                                            />
                                            <button 
                                                onClick={handleAddRequirement}
                                                type="button"
                                                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-6 py-2 rounded-xl text-sm transition-colors font-medium"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-800">
                                <button 
                                    onClick={handleSaveJob}
                                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 w-full md:w-auto"
                                >
                                    Publish Job
                                </button>
                            </div>
                        </div>
                    </div>
                ) : selectedJob ? (
                    // --- JOB DETAIL VIEW ---
                    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
                        {/* Detail Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 bg-gray-900/50 border border-gray-800 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    {getStatusConfig(selectedJob.status).icon}
                                    <span className={`text-sm font-bold uppercase tracking-wider ${getStatusConfig(selectedJob.status).labelColor}`}>
                                        {selectedJob.status}
                                    </span>
                                    <span className="text-gray-600 text-sm">•</span>
                                    <span className="text-gray-500 text-sm">Posted {new Date(selectedJob.postedAt).toLocaleDateString()}</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">{selectedJob.title}</h2>
                                <div className="flex flex-wrap gap-4 text-gray-400">
                                    <span className="flex items-center gap-2 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800 text-sm font-medium">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> 
                                        {selectedJob.department}
                                    </span>
                                    <span className="flex items-center gap-2 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800 text-sm font-medium">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> 
                                        {selectedJob.location}
                                    </span>
                                    <span className="flex items-center gap-2 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800 text-sm font-medium">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
                                        {selectedJob.salaryRange}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 self-start">
                                <button 
                                    onClick={() => handleDeleteJob(selectedJob.id)}
                                    className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/20"
                                    title="Delete Job"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 shadow-xl">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Description</h3>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-base font-light">{selectedJob.description}</p>
                                </div>
                                
                                {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 shadow-xl">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Requirements</h3>
                                        <ul className="space-y-4">
                                            {selectedJob.requirements.map((req, i) => (
                                                <li key={i} className="flex items-start gap-4 text-gray-300 group">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-900 transition-colors border border-emerald-500/20">
                                                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    <span className="text-base">{req}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-lg sticky top-6">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Job Status</h3>
                                    
                                    <div className="flex flex-col gap-2 mb-8">
                                        {['Active', 'Draft', 'Closed'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => handleStatusChange(selectedJob.id, s as any)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${
                                                    selectedJob.status === s 
                                                    ? (s === 'Active' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : s === 'Closed' ? 'bg-gray-700/30 border-gray-600 text-gray-400' : 'bg-amber-500/10 border-amber-500/50 text-amber-400')
                                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                                                }`}
                                            >
                                                <span className="font-semibold text-sm">{s}</span>
                                                {selectedJob.status === s && <div className={`w-2 h-2 rounded-full ${s === 'Active' ? 'bg-emerald-500' : s === 'Draft' ? 'bg-amber-500' : 'bg-gray-500'}`}></div>}
                                            </button>
                                        ))}
                                    </div>

                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Analytics</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-gray-950 rounded-xl border border-gray-800">
                                            <span className="text-sm text-gray-400">Total Applicants</span>
                                            <span className="font-mono font-bold text-white text-lg">0</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-950 rounded-xl border border-gray-800">
                                            <span className="text-sm text-gray-400">Page Views</span>
                                            <span className="font-mono font-bold text-white text-lg">0</span>
                                        </div>
                                    </div>

                                    <button className="w-full mt-6 py-3.5 bg-white hover:bg-gray-200 text-black font-bold rounded-xl transition-colors shadow-lg shadow-white/5">
                                        View Applicants
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-[70vh] flex flex-col items-center justify-center text-gray-600">
                         <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800 shadow-xl">
                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <p className="text-lg font-medium mb-6 text-gray-500">Select a job from the list or create a new one.</p>
                        <button 
                            onClick={() => { setIsCreatingJob(true); setSelectedJobId(null); }}
                            className="px-8 py-3 bg-emerald-600 text-white rounded-full font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all hover:scale-105"
                        >
                            Create Job Posting
                        </button>
                    </div>
                )
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;
