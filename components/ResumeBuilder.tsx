import React, { useState, useRef } from 'react';
import { ApplicantData } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ResumeBuilderProps {
  applicantData: ApplicantData;
  onNext: (data: ApplicantData) => void;
  onBack: () => void;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ applicantData, onNext, onBack }) => {
  const [data, setData] = useState<ApplicantData>(applicantData);
  const [isGenerating, setIsGenerating] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: keyof ApplicantData, value: any) => {
    setData({ ...data, [field]: value });
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    const newEducation = [...(data.education || [])];
    if (!newEducation[index]) {
        newEducation[index] = { school: '', degree: '', year: '' };
    }
    (newEducation[index] as any)[field] = value;
    setData({ ...data, education: newEducation });
  };

  const addEducation = () => {
    setData({
      ...data,
      education: [...(data.education || []), { school: '', degree: '', year: '' }]
    });
  };

  const removeEducation = (index: number) => {
    const newEducation = [...(data.education || [])];
    newEducation.splice(index, 1);
    setData({ ...data, education: newEducation });
  };

  const handleSkillsChange = (value: string) => {
    setData({ ...data, skills: value.split(',').map(s => s.trim()) });
  };

  const downloadPDF = async () => {
    if (!resumeRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(resumeRef.current, { scale: 2 } as any);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.name.replace(/\s+/g, '_')}_Resume.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col md:flex-row gap-6">
      {/* Editor Section */}
      <div className="w-full md:w-1/2 bg-gray-900 p-6 rounded-2xl border border-gray-800 overflow-y-auto h-[calc(100vh-3rem)]">
        <h2 className="text-2xl font-bold mb-6 text-indigo-400">Resume Builder</h2>
        
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-gray-700 pb-2">Personal Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={data.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input 
                    type="email" 
                    placeholder="Email" 
                    value={data.email} 
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input 
                    type="text" 
                    placeholder="Phone" 
                    value={data.phone || ''} 
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input 
                    type="text" 
                    placeholder="Address" 
                    value={data.address || ''} 
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input 
                    type="text" 
                    placeholder="Photo URL" 
                    value={data.photoUrl || ''} 
                    onChange={(e) => handleInputChange('photoUrl', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 outline-none md:col-span-2"
                />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-gray-700 pb-2">Professional Summary</h3>
            <textarea 
                rows={4}
                placeholder="Write a brief summary about yourself..."
                value={data.summary || ''}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Experience */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-gray-700 pb-2">Experience</h3>
            <textarea 
                rows={4}
                placeholder="Describe your work experience..."
                value={data.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Education */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <h3 className="text-lg font-semibold">Education</h3>
                <button onClick={addEducation} className="text-sm text-indigo-400 hover:text-indigo-300">+ Add</button>
            </div>
            {data.education?.map((edu, index) => (
                <div key={index} className="bg-gray-800/50 p-4 rounded-lg relative group">
                    <button 
                        onClick={() => removeEducation(index)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        ✕
                    </button>
                    <div className="grid grid-cols-1 gap-3">
                        <input 
                            type="text" 
                            placeholder="School" 
                            value={edu.school} 
                            onChange={(e) => handleEducationChange(index, 'school', e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded p-2 w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                type="text" 
                                placeholder="Degree" 
                                value={edu.degree} 
                                onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded p-2 w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            <input 
                                type="text" 
                                placeholder="Year" 
                                value={edu.year} 
                                onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded p-2 w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            ))}
            {(!data.education || data.education.length === 0) && (
                <p className="text-gray-500 text-sm italic">No education added yet.</p>
            )}
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-gray-700 pb-2">Skills</h3>
            <input 
                type="text" 
                placeholder="Comma separated skills (e.g. React, TypeScript, Node.js)" 
                value={data.skills?.join(', ') || ''} 
                onChange={(e) => handleSkillsChange(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="pt-6 flex gap-4">
            <button 
                onClick={onBack}
                className="flex-1 py-3 px-4 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800 transition-colors"
            >
                Back
            </button>
            <button 
                onClick={() => onNext(data)}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
            >
                Proceed to Interview
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="w-full md:w-1/2 flex flex-col h-[calc(100vh-3rem)]">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-300">Live Preview</h2>
            <button 
                onClick={downloadPDF}
                disabled={isGenerating}
                className="flex items-center gap-2 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGenerating ? 'Generating...' : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download PDF
                    </>
                )}
            </button>
        </div>
        
        <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden relative">
            <div className="absolute inset-0 overflow-y-auto p-8 flex justify-center bg-gray-500/10">
                <div 
                    ref={resumeRef}
                    className="w-[210mm] min-h-[297mm] bg-white text-black shadow-2xl origin-top transform scale-[0.6] md:scale-[0.7] lg:scale-[0.8] transition-transform"
                >
                    <div className="p-10 h-full flex flex-col">
                        {/* Header */}
                        <div className="flex gap-6 border-b-2 border-gray-800 pb-6 mb-6">
                            {data.photoUrl && (
                                <img 
                                    src={data.photoUrl} 
                                    alt="Profile" 
                                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            )}
                            <div className="flex-1">
                                <h1 className="text-4xl font-bold text-gray-900 mb-2 uppercase tracking-wider">{data.name || 'Your Name'}</h1>
                                <p className="text-xl text-indigo-600 font-medium mb-3">{data.role || 'Target Role'}</p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    {data.email && (
                                        <span className="flex items-center gap-1">
                                            ✉️ {data.email}
                                        </span>
                                    )}
                                    {data.phone && (
                                        <span className="flex items-center gap-1">
                                            📞 {data.phone}
                                        </span>
                                    )}
                                    {data.address && (
                                        <span className="flex items-center gap-1">
                                            📍 {data.address}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-3 gap-8 flex-1">
                            {/* Left Column */}
                            <div className="col-span-2 space-y-8">
                                {data.summary && (
                                    <section>
                                        <h3 className="text-lg font-bold text-gray-800 uppercase border-b border-gray-300 mb-3 pb-1">Professional Summary</h3>
                                        <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{data.summary}</p>
                                    </section>
                                )}

                                {data.experience && (
                                    <section>
                                        <h3 className="text-lg font-bold text-gray-800 uppercase border-b border-gray-300 mb-3 pb-1">Experience</h3>
                                        <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{data.experience}</div>
                                    </section>
                                )}
                            </div>

                            {/* Right Column */}
                            <div className="col-span-1 space-y-8 bg-gray-50 p-4 rounded-lg h-fit">
                                {data.education && data.education.length > 0 && (
                                    <section>
                                        <h3 className="text-lg font-bold text-gray-800 uppercase border-b border-gray-300 mb-3 pb-1">Education</h3>
                                        <div className="space-y-4">
                                            {data.education.map((edu, i) => (
                                                <div key={i}>
                                                    <div className="font-bold text-gray-900">{edu.school}</div>
                                                    <div className="text-indigo-600 text-sm">{edu.degree}</div>
                                                    <div className="text-gray-500 text-xs">{edu.year}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {data.skills && data.skills.length > 0 && (
                                    <section>
                                        <h3 className="text-lg font-bold text-gray-800 uppercase border-b border-gray-300 mb-3 pb-1">Skills</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {data.skills.map((skill, i) => (
                                                <span key={i} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-medium">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
