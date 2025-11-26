import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface EmployerDashboardProps {
  onLogout: () => void;
}

const EmployerDashboard: React.FC<EmployerDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'post' | 'listings' | 'candidates'>('post');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">E</span>
              </div>
              <span className="font-bold text-xl tracking-tight">Employer Portal</span>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-xl mb-8 w-fit">
          {[
            { id: 'post', label: 'Post a Job' },
            { id: 'listings', label: 'My Listings' },
            { id: 'candidates', label: 'Candidates' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 min-h-[400px]">
          {activeTab === 'post' && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Post a New Job</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                Create a new job listing to find the perfect candidate. This feature is coming soon!
              </p>
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition-colors">
                Create Listing
              </button>
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="text-center py-20">
              <p className="text-gray-400">No active listings found.</p>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="text-center py-20">
              <p className="text-gray-400">No candidates applied yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;
