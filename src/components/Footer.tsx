import React, { useState, useEffect } from 'react';
import { ExternalLink, Heart, Shield, Info, BookOpen, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

interface FooterProps {
  onVersionClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onVersionClick }) => {
  const [systemStatus, setSystemStatus] = useState<'checking' | 'operational' | 'error'>('checking');
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await apiClient.healthCheck();
        setSystemStatus(health.status === 'healthy' ? 'operational' : 'error');
      } catch {
        setSystemStatus('error');
      }
    };
    checkHealth();
    // Re-check every 60 seconds
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    checking: { color: 'bg-yellow-500', text: 'Checking...' },
    operational: { color: 'bg-green-500 animate-pulse', text: 'System Operational' },
    error: { color: 'bg-red-500', text: 'System Issue Detected' }
  };
  
  return (
    <footer className="w-full bg-slate-950/60 backdrop-blur-xl border-t border-slate-800/50 py-12 mt-auto z-10 relative">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Column 1: Brand & Copyright */}
            <div className="space-y-6">
                 <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent neon-text-cyan inline-block">
                   The Epstein Files
                 </h3>
                 <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                   A comprehensive, searchable forensic archive of documents, connections, and financial flows regarding the Jeffrey Epstein network.
                 </p>
                 <div className="pt-2 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusConfig[systemStatus].color}`}></div>
                    <p className="text-slate-500 text-xs font-mono">
                      {statusConfig[systemStatus].text}
                    </p>
                 </div>
            </div>

            {/* Column 2: Mission & Transparency */}
            <div className="space-y-6">
                <h4 className="text-slate-100 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-cyan-400" /> Mission
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                    <li>
                        <Link to="/about" className="hover:text-cyan-400 transition-colors flex items-center gap-2 group w-fit">
                            <span className="group-hover:translate-x-1 transition-transform">Transparency Vow</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    </li>
                    <li>
                        <Link to="/about" className="hover:text-cyan-400 transition-colors flex items-center gap-2 group w-fit">
                            <span className="group-hover:translate-x-1 transition-transform">Methodology & Ethics</span>
                        </Link>
                    </li>
                </ul>
            </div>

            {/* Column 3: Support */}
            <div className="space-y-6">
                <h4 className="text-slate-100 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Heart className="w-4 h-4 text-pink-500" /> Support
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                    <li>
                         <a href="https://coff.ee/generik" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors flex items-center gap-2 group w-fit">
                            <span className="group-hover:translate-x-1 transition-transform">Support the Investigation</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </a>
                    </li>
                    <li>
                        <p className="text-xs text-slate-500 mt-2 italic border-l-2 border-slate-800 pl-3">
                            "Independent open-source intelligence requires community support."
                        </p>
                    </li>
                </ul>
            </div>

            {/* Column 4: Network */}
             <div className="space-y-6">
                <h4 className="text-slate-100 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <BookOpen className="w-4 h-4 text-blue-400" /> Network
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                     <li>
                        <a href="https://github.com/ErikVeland/epstein-archive" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-2 group w-fit">
                             <Github className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                             <span className="group-hover:translate-x-1 transition-transform">GitHub Repository</span>
                             <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </li>
                     <li>
                        <a href="https://about.glasscode.academy" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-2 group w-fit">
                             <span className="group-hover:translate-x-1 transition-transform">Glass Academy</span>
                             <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </li>
                    <li>
                        <a href="https://generik.substack.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-2 group w-fit">
                             <span className="group-hover:translate-x-1 transition-transform">The End Times (Substack)</span>
                             <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </li>
                </ul>
            </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <div className="flex flex-col md:flex-row items-center gap-4">
                <span className="text-slate-600">&copy; 2025 Glass Academy. All rights reserved.</span>
                <span className="hidden md:inline text-slate-700">|</span>
                <button 
                  onClick={onVersionClick}
                  className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800 hover:border-cyan-500/30"
                  title="View Release Notes"
                >
                  <span className="font-mono text-cyan-500/80">v{__APP_VERSION__}</span>
                  <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span>Updated: {__BUILD_DATE__}</span>
                </button>
            </div>
            <div className="flex items-center gap-6">
                <a href="#" className="hover:text-slate-300 transition-colors hover:underline decoration-slate-700 underline-offset-4">Privacy Policy</a>
                <a href="#" className="hover:text-slate-300 transition-colors hover:underline decoration-slate-700 underline-offset-4">Terms of Service</a>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
