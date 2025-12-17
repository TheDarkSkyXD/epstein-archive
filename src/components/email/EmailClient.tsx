
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Mail, Inbox, Search, ChevronDown, ChevronRight, X, ChevronLeft, Clock, User, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/apiClient';
import { Document } from '../../types/documents';

// --- Types ---

interface Email extends Document {
  sender?: string;
  recipient?: string;
  subject?: string;
  threadId?: string;
  isRead?: boolean;
  date: string;
}

interface Thread {
  id: string;
  subject: string;
  lastMessageDate: string;
  messages: Email[];
  participantNames: string[];
  snippet: string;
  hasAttachments: boolean;
  unreadCount: number;
}

type SortField = 'date' | 'sender' | 'subject';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 500;

// --- Liquid Glass Email Client ---

export const EmailClient: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [floatingThreadId, setFloatingThreadId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [loadedEmails, setLoadedEmails] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  
  const listRef = useRef<HTMLDivElement>(null);
  const isMobileDetail = !!selectedThreadId;

  useEffect(() => {
    loadInitialEmails();
  }, []);

  const loadInitialEmails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getDocuments({ evidenceType: 'email' }, 1, PAGE_SIZE);
      setAllDocs(response.data);
      setTotalEmails(response.total);
      setLoadedEmails(response.data.length);
      setHasMore(response.data.length < response.total);
      setCurrentPage(1);
      processDocsToThreads(response.data);
    } catch (e) {
      console.error("Failed to load emails", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreEmails = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await apiClient.getDocuments({ evidenceType: 'email' }, nextPage, PAGE_SIZE);
      if (response.data.length === 0) { setHasMore(false); return; }
      const newDocs = [...allDocs, ...response.data];
      setAllDocs(newDocs);
      setLoadedEmails(newDocs.length);
      setCurrentPage(nextPage);
      setHasMore(newDocs.length < response.total);
      processDocsToThreads(newDocs);
    } catch (e) {
      console.error("Failed to load more emails", e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentPage, allDocs]);

  const processDocsToThreads = (docs: any[]) => {
    const grouped: Record<string, Email[]> = {};
    docs.forEach((doc: any) => {
      const meta = doc.metadata || {};
      const threadId = meta.thread_id || meta.threadId || doc.id;
      const email: Email = {
        ...doc,
        sender: meta.from || meta.sender || extractSender(doc.content) || 'Unknown',
        recipient: meta.to || meta.recipient || 'Unknown',
        subject: meta.subject || doc.title || '(No Subject)',
        threadId,
        date: doc.dateCreated || doc.date || '',
        isRead: true
      };
      if (!grouped[threadId]) grouped[threadId] = [];
      grouped[threadId].push(email);
    });

    const threadList: Thread[] = Object.entries(grouped).map(([id, msgs]) => {
      msgs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const lastMsg = msgs[msgs.length - 1];
      return {
        id,
        subject: lastMsg.subject || '(No Subject)',
        lastMessageDate: lastMsg.date,
        messages: msgs,
        participantNames: [...new Set(msgs.map(m => m.sender || 'Unknown'))],
        snippet: cleanSnippet(lastMsg.content?.substring(0, 120) || ''),
        hasAttachments: false,
        unreadCount: 0
      };
    });
    setThreads(threadList);
  };

  function extractSender(content?: string): string | null {
    if (!content) return null;
    const match = content.match(/From:\s*([^\n<]+)/i);
    return match ? match[1].trim() : null;
  }

  function cleanSnippet(text: string): string {
    return text.replace(/From:.*?\n/gi, '').replace(/To:.*?\n/gi, '').replace(/Subject:.*?\n/gi, '').replace(/Date:.*?\n/gi, '').replace(/\n+/g, ' ').trim();
  }

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (scrollBottom < 200 && !loadingMore && hasMore) loadMoreEmails();
  }, [loadMoreEmails, loadingMore, hasMore]);

  const filteredThreads = useMemo(() => {
    let t = [...threads];
    if (selectedAccount !== 'all') {
      const accLower = selectedAccount.toLowerCase();
      t = t.filter(th => {
        const first = th.messages[0];
        const src = (first.metadata as any)?.source_collection || '';
        const sender = (first.sender || '').toLowerCase();
        return src.toLowerCase().includes(accLower) || sender.includes(accLower);
      });
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      t = t.filter(th => th.subject.toLowerCase().includes(s) || th.participantNames.some(p => p.toLowerCase().includes(s)) || th.snippet.toLowerCase().includes(s));
    }
    t.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'date': valA = new Date(a.lastMessageDate).getTime(); valB = new Date(b.lastMessageDate).getTime(); break;
        case 'sender': valA = a.participantNames[0] || ''; valB = b.participantNames[0] || ''; break;
        case 'subject': valA = a.subject; valB = b.subject; break;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return t;
  }, [threads, selectedAccount, searchTerm, sortField, sortOrder]);

  const selectedThread = useMemo(() => threads.find(t => t.id === selectedThreadId), [threads, selectedThreadId]);
  const floatingThread = useMemo(() => threads.find(t => t.id === floatingThreadId), [threads, floatingThreadId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 1) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gradient-to-br from-slate-100 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      
      {/* Liquid Glass Sidebar */}
      <aside className="hidden md:flex w-60 flex-col m-3 mr-0 rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20">
        <div className="p-5 pb-3">
          <h2 className="text-[11px] font-bold text-slate-500/80 dark:text-white/40 uppercase tracking-widest">Mailboxes</h2>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <GlassSidebarItem icon={Inbox} label="All Inboxes" count={totalEmails} active={selectedAccount === 'all'} onClick={() => setSelectedAccount('all')} />
          
          <div className="pt-5 pb-2 px-2">
            <h3 className="text-[10px] font-bold text-slate-400/60 dark:text-white/30 uppercase tracking-widest">Accounts</h3>
          </div>
          
          <GlassSidebarItem icon={Mail} label="Ehud Barak" active={selectedAccount === 'barak'} onClick={() => setSelectedAccount('barak')} />
          <GlassSidebarItem icon={Mail} label="Jeffrey Epstein" active={selectedAccount === 'jee'} onClick={() => setSelectedAccount('jee')} />
          <GlassSidebarItem icon={Mail} label="House Oversight" active={selectedAccount === 'oversight'} onClick={() => setSelectedAccount('oversight')} />
        </nav>
        
        <div className="p-4 border-t border-white/30 dark:border-white/5">
          <div className="text-[11px] text-slate-500/70 dark:text-white/30 text-center font-medium">
            {loadedEmails.toLocaleString()} of {totalEmails.toLocaleString()}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row p-3 gap-3 min-w-0">
        
        {/* Message List - Glass Panel */}
        <div className={`w-full md:w-[400px] flex flex-col rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden ${isMobileDetail ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Search Bar */}
          <div className="p-4 border-b border-black/5 dark:border-white/5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40" />
              <input 
                type="text" 
                placeholder="Search emails..." 
                className="w-full pl-11 pr-4 py-3 bg-black/5 dark:bg-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-slate-400 dark:placeholder-white/30 font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Sort Header */}
          <div className="px-5 py-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40 border-b border-black/5 dark:border-white/5 font-semibold uppercase tracking-wide">
            <span>{filteredThreads.length.toLocaleString()} conversations</span>
            <div className="flex items-center gap-4">
              <button onClick={() => handleSort('date')} className={`flex items-center gap-1.5 transition-colors ${sortField === 'date' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-700 dark:hover:text-white/60'}`}>
                <Clock className="w-3.5 h-3.5" /> Date
              </button>
              <button onClick={() => handleSort('sender')} className={`flex items-center gap-1.5 transition-colors ${sortField === 'sender' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-700 dark:hover:text-white/60'}`}>
                <User className="w-3.5 h-3.5" /> From
              </button>
            </div>
          </div>

          {/* Message List */}
          <div ref={listRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
            {loading ? (
              <div className="p-10 text-center text-slate-400 dark:text-white/30">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin opacity-40" />
                <div className="font-medium">Loading messages...</div>
              </div>
            ) : (
              <>
                {filteredThreads.map(thread => (
                  <GlassMessageItem key={thread.id} thread={thread} selected={selectedThreadId === thread.id} onClick={() => setSelectedThreadId(thread.id)} formatDate={formatDate} />
                ))}
                {loadingMore && (
                  <div className="p-5 text-center"><Loader2 className="w-5 h-5 mx-auto animate-spin text-blue-500/50" /></div>
                )}
                {hasMore && !loadingMore && (
                  <div className="p-5 text-center">
                    <button onClick={loadMoreEmails} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      Load more ({(totalEmails - loadedEmails).toLocaleString()} remaining)
                    </button>
                  </div>
                )}
                {!hasMore && loadedEmails > 0 && (
                  <div className="p-5 text-center text-[11px] text-slate-400 dark:text-white/20 font-medium">All {loadedEmails.toLocaleString()} emails loaded</div>
                )}
              </>
            )}
            {!loading && filteredThreads.length === 0 && (
              <div className="p-10 text-center text-slate-400 dark:text-white/30">
                <Mail className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No messages found</p>
              </div>
            )}
          </div>
        </div>

        {/* Reading Pane - Glass Panel */}
        <div className={`flex-1 flex flex-col rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden ${!selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          {selectedThread ? (
            <>
              {/* Message Header */}
              <div className="p-6 border-b border-black/5 dark:border-white/5 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 dark:to-transparent">
                <button className="md:hidden mb-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-semibold" onClick={() => setSelectedThreadId(null)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3 leading-tight">{selectedThread.subject}</h1>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/50 font-medium">
                  <Users className="w-4 h-4" />
                  <span>{selectedThread.participantNames.join(', ')}</span>
                  <span className="text-slate-300 dark:text-white/20">•</span>
                  <span>{selectedThread.messages.length} message{selectedThread.messages.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50/50 to-white/30 dark:from-slate-900/30 dark:to-transparent">
                {selectedThread.messages.map((msg, idx) => (
                  <GlassMessageBubble key={msg.id} email={msg} expanded={idx === selectedThread.messages.length - 1} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-50/30 to-transparent dark:from-transparent">
              <div className="text-center text-slate-400 dark:text-white/20">
                <Mail className="w-20 h-20 mx-auto mb-5 opacity-15" />
                <p className="text-lg font-semibold">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {floatingThread && <GlassFloatingWindow thread={floatingThread} onClose={() => setFloatingThreadId(null)} />}
      </AnimatePresence>
    </div>
  );
};

// --- Liquid Glass Components ---

const GlassSidebarItem = ({ icon: Icon, label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      active 
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
        : 'text-slate-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className={`w-[18px] h-[18px] ${active ? 'text-white' : 'text-slate-400 dark:text-white/40'}`} />
      <span>{label}</span>
    </div>
    {count !== undefined && (
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${active ? 'bg-white/25' : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-white/50'}`}>
        {count.toLocaleString()}
      </span>
    )}
  </button>
);

const GlassMessageItem = ({ thread, selected, onClick, formatDate }: { thread: Thread, selected: boolean, onClick: () => void, formatDate: (d: string) => string }) => (
  <motion.div 
    onClick={onClick}
    whileHover={{ backgroundColor: selected ? undefined : 'rgba(0,0,0,0.02)' }}
    className={`px-5 py-4 border-b border-black/5 dark:border-white/5 cursor-pointer transition-all duration-200 ${
      selected 
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/10' 
        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
    }`}
  >
    <div className="flex items-center justify-between mb-1.5">
      <span className={`font-bold text-sm truncate flex-1 mr-3 ${selected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
        {thread.participantNames[0]}
      </span>
      <span className={`text-[11px] font-medium whitespace-nowrap ${selected ? 'text-white/80' : 'text-slate-400 dark:text-white/40'}`}>
        {formatDate(thread.lastMessageDate)}
      </span>
    </div>
    <div className={`text-[13px] truncate mb-1 font-semibold ${selected ? 'text-white' : 'text-slate-700 dark:text-white/80'}`}>
      {thread.subject}
    </div>
    <div className={`text-[12px] truncate ${selected ? 'text-white/70' : 'text-slate-400 dark:text-white/40'}`}>
      {thread.snippet}
    </div>
  </motion.div>
);

const GlassMessageBubble = ({ email, expanded }: { email: Email, expanded: boolean }) => {
  const [isExpanded, setExpanded] = useState(expanded);

  return (
    <motion.div 
      layout
      className="bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/10 border border-white/80 dark:border-white/10 overflow-hidden"
    >
      <div className="p-5 flex items-start gap-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors" onClick={() => setExpanded(!isExpanded)}>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-blue-500/25">
          {(email.sender || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800 dark:text-white truncate">{email.sender}</span>
            <span className="text-[11px] text-slate-400 dark:text-white/40 ml-3 shrink-0 font-medium">{new Date(email.date).toLocaleString()}</span>
          </div>
          <div className="text-[12px] text-slate-500 dark:text-white/50 truncate font-medium">To: {email.recipient}</div>
        </div>
        <button className="p-2 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0">
              <div className="pl-[60px]">
                <div className="text-[14px] text-slate-700 dark:text-white/80 leading-relaxed whitespace-pre-wrap">
                  {email.content || '(No content)'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const GlassFloatingWindow = ({ thread, onClose }: { thread: Thread, onClose: () => void }) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    draggingRef.current = true;
    offsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current) return;
    setPosition({ x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y });
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed w-[650px] h-[550px] bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/20 z-50 flex flex-col overflow-hidden border border-white/60 dark:border-white/10"
      style={{ left: position.x, top: position.y }}
    >
      <div className="h-14 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 dark:to-transparent border-b border-black/5 dark:border-white/5 flex items-center justify-between px-5 cursor-move" onMouseDown={handleMouseDown}>
        <span className="text-sm font-bold text-slate-700 dark:text-white truncate pr-4">{thread.subject}</span>
        <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors">
          <X className="w-4 h-4 text-slate-500 dark:text-white/50" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-slate-50/50 to-white/30 dark:from-transparent dark:to-transparent">
        {thread.messages.map((msg) => (<GlassMessageBubble key={msg.id} email={msg} expanded={true} />))}
      </div>
    </motion.div>
  );
};

export default EmailClient;
