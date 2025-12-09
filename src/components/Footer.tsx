import React from 'react';
import { ExternalLink, Heart, Shield, Info, BookOpen, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-950/80 backdrop-blur-md border-t border-slate-800/50 py-10 mt-auto z-10 relative">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-8">
            {/* Column 1: Brand & Copyright */}
            <div className="space-y-4">
                 <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                   The Epstein Files
                 </h3>
                 <p className="text-slate-400 text-sm leading-relaxed">
                   A comprehensive, searchable forensic archive of documents, connections, and financial flows regarding the Jeffrey Epstein network.
                 </p>
                 <div className="pt-2">
                    <p className="text-slate-600 text-xs">
                      &copy; 2025 Glass Academy. All rights reserved.
                    </p>
                 </div>
            </div>

            {/* Column 2: Mission & Transparency */}
            <div className="space-y-4">
                <h4 className="text-slate-200 font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-cyan-400" /> Mission
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                    <li>
                        <Link to="/about" className="hover:text-cyan-400 transition-colors flex items-center gap-2 group">
                            <span>Transparency Vow</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    </li>
                    <li>
                        <Link to="/about" className="hover:text-cyan-400 transition-colors">
                            Methodology & Ethics
                        </Link>
                    </li>
                </ul>
            </div>

            {/* Column 3: Support */}
            <div className="space-y-4">
                <h4 className="text-slate-200 font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Heart className="w-4 h-4 text-pink-500" /> Support
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                    <li>
                         <a href="https://coff.ee/generik" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors flex items-center gap-2 group">
                            <span>Support the Investigation</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </a>
                    </li>
                    <li>
                        <p className="text-xs text-slate-500 mt-2">
                            Independent open-source intelligence requires community support.
                        </p>
                    </li>
                </ul>
            </div>

            {/* Column 4: Network */}
             <div className="space-y-4">
                <h4 className="text-slate-200 font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <BookOpen className="w-4 h-4 text-blue-400" /> Network
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                     <li>
                        <a href="https://about.glasscode.academy" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-2 group">
                             <span>Glass Academy</span>
                             <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </li>
                    <li>
                        <a href="https://generik.substack.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-2 group">
                             <span>The End Times (Substack)</span>
                             <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </li>
                </ul>
            </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-4">
                <span>v3.9.0</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                <span>Last Updated: Dec 6, 2025</span>
            </div>
            <div className="flex items-center gap-6">
                <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
