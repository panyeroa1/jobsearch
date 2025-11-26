import React, { useState, useRef, useEffect } from 'react';
import { ApplicantData } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '../services/supabase';

interface ResumeBuilderProps {
  applicantData: ApplicantData;
  onNext: (data: ApplicantData) => void;
  onBack: () => void;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ applicantData, onNext, onBack }) => {
  const [data, setData] = useState<ApplicantData>(applicantData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Camera & Editing State
  const [showCamera, setShowCamera] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    sepia: 0,
  });

  const resumeRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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

  // --- Camera Functions ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgUrl = canvas.toDataURL('image/png');
        setCapturedImage(imgUrl);
        stopCamera();
        setShowEditor(true);
        // Reset filters
        setFilters({ brightness: 100, contrast: 100, saturate: 100, sepia: 0 });
      }
    }
  };

  // --- Editor Functions ---

  const applyStudioPreset = () => {
    setFilters({
        brightness: 110,
        contrast: 115,
        saturate: 90,
        sepia: 10
    });
  };

  const saveEditedPhoto = async () => {
    if (!capturedImage) return;
    
    // Draw filtered image to canvas to bake in changes
    const img = new Image();
    img.src = capturedImage;
    await new Promise(r => img.onload = r);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) sepia(${filters.sepia}%)`;
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `studio_${Math.random()}.png`;
        
        setUploading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(fileName, blob);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(fileName);

            setData({ ...data, photoUrl: publicUrlData.publicUrl });
            setShowEditor(false);
            setCapturedImage(null);
        } catch (error) {
            console.error('Error uploading studio photo:', error);
            alert('Error saving photo');
        } finally {
            setUploading(false);
        }
    }, 'image/png');
  };

  // --- Existing Upload ---

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    // Create local preview for editing
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target?.result) {
            setCapturedImage(e.target.result as string);
            setShowEditor(true);
            setFilters({ brightness: 100, contrast: 100, saturate: 100, sepia: 0 });
        }
    };
    reader.readAsDataURL(file);
    
    // Clear input
    e.target.value = '';
  };

  const handleProceed = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
         const { error } = await supabase
          .from('applicants')
          .update({
            name: data.name,
            email: data.email,
            role: data.role,
            experience: data.experience,
            photo_url: data.photoUrl,
            resume_data: {
                phone: data.phone,
                address: data.address,
                education: data.education,
                skills: data.skills,
                summary: data.summary
            }
          })
          .eq('user_id', user.id);

          if (error) throw error;
      }

      onNext(data);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error saving data. Proceeding anyway.');
      onNext(data);
    } finally {
      setSaving(false);
    }
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
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col md:flex-row gap-6 relative">
      
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 p-6 rounded-2xl max-w-2xl w-full border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Take Photo</h3>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={stopCamera} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={takePhoto} className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200">Capture</button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && capturedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 p-6 rounded-2xl max-w-4xl w-full border border-gray-700 flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                    <h3 className="text-xl font-bold mb-4">Studio Editor</h3>
                    <div className="relative aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        <img 
                            src={capturedImage} 
                            alt="Edit" 
                            className="max-w-full max-h-full object-contain transition-all duration-200 studio-filter"
                            style={{
                                '--brightness': `${filters.brightness}%`,
                                '--contrast': `${filters.contrast}%`,
                                '--saturate': `${filters.saturate}%`,
                                '--sepia': `${filters.sepia}%`
                            } as React.CSSProperties}
                        />
                    </div>
                </div>
                <div className="w-full md:w-80 space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">Brightness</label>
                            <span className="text-xs text-gray-500">{filters.brightness}%</span>
                        </div>
                        <input 
                            type="range" min="50" max="150" value={filters.brightness} 
                            aria-label="Brightness"
                            onChange={(e) => setFilters({...filters, brightness: Number(e.target.value)})}
                            className="w-full accent-indigo-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">Contrast</label>
                            <span className="text-xs text-gray-500">{filters.contrast}%</span>
                        </div>
                        <input 
                            type="range" min="50" max="150" value={filters.contrast} 
                            aria-label="Contrast"
                            onChange={(e) => setFilters({...filters, contrast: Number(e.target.value)})}
                            className="w-full accent-indigo-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">Saturation</label>
                            <span className="text-xs text-gray-500">{filters.saturate}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="200" value={filters.saturate} 
                            aria-label="Saturation"
                            onChange={(e) => setFilters({...filters, saturate: Number(e.target.value)})}
                            className="w-full accent-indigo-500"
                        />
                    </div>
                    
                    <button 
                        onClick={applyStudioPreset}
                        className="w-full py-2 px-4 bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 rounded-lg hover:bg-indigo-600/30 transition-colors flex items-center justify-center gap-2"
                    >
                        ✨ Auto Studio Enhance
                    </button>

                    <div className="pt-6 flex gap-3">
                        <button onClick={() => { setShowEditor(false); setCapturedImage(null); }} className="flex-1 py-3 border border-gray-600 rounded-xl hover:bg-gray-800">Discard</button>
                        <button onClick={saveEditedPhoto} disabled={uploading} className="flex-1 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50">
                            {uploading ? 'Saving...' : 'Save Photo'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Main Editor Section */}
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
                
                <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-2">Profile Photo</label>
                    <div className="flex flex-wrap items-center gap-4">
                        <button 
                            onClick={startCamera}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Take Photo
                        </button>
                        <span className="text-gray-500">or</span>
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Upload
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
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
                            aria-label="School"
                            value={edu.school} 
                            onChange={(e) => handleEducationChange(index, 'school', e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded p-2 w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                type="text" 
                                placeholder="Degree" 
                                aria-label="Degree"
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
                onClick={handleProceed}
                disabled={saving}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? 'Saving...' : 'Proceed to Interview'}
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
                    <div className="flex h-full min-h-[297mm]">
                        {/* Sidebar */}
                        <div className="w-1/3 bg-gray-900 text-white p-8 flex flex-col gap-8">
                            <div className="text-center">
                                {data.photoUrl && (
                                    <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gray-700">
                                        <img 
                                            src={data.photoUrl} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    </div>
                                )}
                                <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">{data.name || 'Your Name'}</h1>
                                <p className="text-indigo-400 font-medium">{data.role || 'Target Role'}</p>
                            </div>

                            <div className="space-y-4 text-sm text-gray-300">
                                {data.email && (
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">✉️</span>
                                        <span className="break-all">{data.email}</span>
                                    </div>
                                )}
                                {data.phone && (
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">📞</span>
                                        <span>{data.phone}</span>
                                    </div>
                                )}
                                {data.address && (
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">📍</span>
                                        <span>{data.address}</span>
                                    </div>
                                )}
                            </div>

                            {data.skills && data.skills.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold uppercase border-b border-gray-700 pb-2 mb-4">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {data.skills.map((skill, i) => (
                                            <span key={i} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {data.education && data.education.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold uppercase border-b border-gray-700 pb-2 mb-4">Education</h3>
                                    <div className="space-y-4">
                                        {data.education.map((edu, i) => (
                                            <div key={i}>
                                                <div className="font-bold text-white">{edu.school}</div>
                                                <div className="text-indigo-400 text-sm">{edu.degree}</div>
                                                <div className="text-gray-500 text-xs">{edu.year}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Content */}
                        <div className="w-2/3 p-10 bg-white text-gray-800">
                            {data.summary && (
                                <section className="mb-8">
                                    <h3 className="text-xl font-bold text-gray-900 uppercase border-b-2 border-gray-200 pb-2 mb-4">Profile</h3>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{data.summary}</p>
                                </section>
                            )}

                            {data.experience && (
                                <section>
                                    <h3 className="text-xl font-bold text-gray-900 uppercase border-b-2 border-gray-200 pb-2 mb-4">Experience</h3>
                                    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">{data.experience}</div>
                                </section>
                            )}
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
