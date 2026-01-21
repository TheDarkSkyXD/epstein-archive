import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Mail,
  Inbox,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  User,
  Loader2,
  Archive,
  Reply,
  Forward,
  Trash2,
  Users,
  Bell,
  Tag,
  Star,
  Link2,
  ExternalLink,
} from 'lucide-react';
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
  summary?: string;
  category?: 'primary' | 'updates' | 'promotions' | 'social';
  isFromKnownEntity?: boolean;
  knownEntityName?: string;
}

type EmailCategory = 'all' | 'primary' | 'updates' | 'promotions';

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

interface Mailbox {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

type SortField = 'date' | 'sender' | 'subject';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 500;

// --- iOS Mail-Style Email Client ---

export const EmailClient: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showMailboxDrawer, setShowMailboxDrawer] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [loadedEmails, setLoadedEmails] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<EmailCategory>('primary'); // Default to primary (real people)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const listRef = useRef<HTMLDivElement>(null);
  const isMobileDetail = !!selectedThreadId;

  // Mailbox definitions
  const mailboxes: Mailbox[] = useMemo(
    () => [
      { id: 'all', label: 'All Inboxes', icon: Inbox, count: totalEmails },
      { id: 'barak', label: 'Ehud Barak', icon: Mail },
      { id: 'jee', label: 'Jeffrey Epstein', icon: Mail },
      { id: 'gmax', label: 'Ghislaine Maxwell', icon: Mail },
      { id: 'oversight', label: 'House Oversight', icon: Mail },
    ],
    [totalEmails],
  );

  const currentMailbox = mailboxes.find((m) => m.id === selectedAccount) || mailboxes[0];

  // Debounce search term for performance
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadInitialEmails();
    loadCategoryCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadInitialEmails is stable and only runs on mount
  }, []);

  // Reload when category changes
  useEffect(() => {
    loadInitialEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  const loadCategoryCounts = async () => {
    try {
      const res = await fetch('/api/emails/categories');
      if (res.ok) {
        const counts = await res.json();
        setCategoryCounts(counts);
      }
    } catch (e) {
      console.error('Failed to load category counts', e);
    }
  };

  const loadInitialEmails = async () => {
    setLoading(true);
    try {
      // Use the new category-filtered endpoint
      const categoryParam = activeCategory !== 'all' ? `&category=${activeCategory}` : '';
      const res = await fetch(`/api/emails?page=1&limit=${PAGE_SIZE}${categoryParam}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const response = await res.json();
      setAllDocs(response.data);
      setTotalEmails(response.total);
      setLoadedEmails(response.data.length);
      setHasMore(response.data.length < response.total);
      setCurrentPage(1);
      processDocsToThreads(response.data);
    } catch (e) {
      console.error('Failed to load emails', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreEmails = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const categoryParam = activeCategory !== 'all' ? `&category=${activeCategory}` : '';
      const res = await fetch(`/api/emails?page=${nextPage}&limit=${PAGE_SIZE}${categoryParam}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const response = await res.json();
      if (response.data.length === 0) {
        setHasMore(false);
        return;
      }
      const newDocs = [...allDocs, ...response.data];
      setAllDocs(newDocs);
      setLoadedEmails(newDocs.length);
      setCurrentPage(nextPage);
      setHasMore(newDocs.length < response.total);
      processDocsToThreads(newDocs);
    } catch (e) {
      console.error('Failed to load more emails', e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentPage, allDocs, activeCategory]);

  const processDocsToThreads = (docs: any[]) => {
    const threadsMap = new Map<string, Thread>();

    for (const doc of docs) {
      const threadId = doc.metadata?.thread_id || doc.id;
      const sender = doc.metadata?.from || doc.metadata?.sender || 'Unknown Sender';
      const recipient = doc.metadata?.to || doc.metadata?.recipient || '';
      const subject = doc.metadata?.subject || doc.title || 'No Subject';
      const snippet = cleanSnippet(doc.content || doc.summary || '');

      const email: Email = {
        ...doc,
        sender,
        recipient,
        subject,
        threadId,
        date: doc.date || doc.created_at || new Date().toISOString(),
        isRead: true,
      };

      if (threadsMap.has(threadId)) {
        const thread = threadsMap.get(threadId)!;
        thread.messages.push(email);
        if (new Date(email.date) > new Date(thread.lastMessageDate)) {
          thread.lastMessageDate = email.date;
          thread.snippet = snippet;
        }
        if (!thread.participantNames.includes(sender)) {
          thread.participantNames.push(sender);
        }
      } else {
        threadsMap.set(threadId, {
          id: threadId,
          subject,
          lastMessageDate: email.date,
          messages: [email],
          participantNames: [sender],
          snippet,
          hasAttachments: false,
          unreadCount: 0,
        });
      }
    }

    setThreads(Array.from(threadsMap.values()));
  };

  function cleanSnippet(text: string): string {
    return text
      .replace(/From:.*?\n/gi, '')
      .replace(/To:.*?\n/gi, '')
      .replace(/Subject:.*?\n/gi, '')
      .replace(/Date:.*?\n/gi, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 150);
  }

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (scrollBottom < 200 && !loadingMore && hasMore) loadMoreEmails();
    },
    [loadMoreEmails, loadingMore, hasMore],
  );

  const filteredThreads = useMemo(() => {
    let t = [...threads];
    if (selectedAccount !== 'all') {
      const accLower = selectedAccount.toLowerCase();
      t = t.filter((th) => {
        const first = th.messages[0];
        const src = (first.metadata as any)?.source_collection || '';
        const sender = (first.sender || '').toLowerCase();
        const recipient = (first.recipient || '').toLowerCase();

        if (accLower === 'gmax') {
          return (
            sender.includes('gmax') ||
            sender.includes('ellmax.com') ||
            sender.includes('ghislaine') ||
            recipient.includes('gmax') ||
            recipient.includes('ellmax.com') ||
            src.toLowerCase().includes('gmax') ||
            src.toLowerCase().includes('maxwell')
          );
        }
        return src.toLowerCase().includes(accLower) || sender.includes(accLower);
      });
    }
    if (debouncedSearchTerm) {
      const s = debouncedSearchTerm.toLowerCase();
      t = t.filter(
        (th) =>
          th.subject.toLowerCase().includes(s) ||
          th.participantNames.some((p) => p.toLowerCase().includes(s)) ||
          th.snippet.toLowerCase().includes(s),
      );
    }
    t.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'date':
          valA = new Date(a.lastMessageDate).getTime();
          valB = new Date(b.lastMessageDate).getTime();
          break;
        case 'sender':
          valA = a.participantNames[0] || '';
          valB = b.participantNames[0] || '';
          break;
        case 'subject':
          valA = a.subject;
          valB = b.subject;
          break;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return t;
  }, [threads, selectedAccount, debouncedSearchTerm, sortField, sortOrder]);

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId),
    [threads, selectedThreadId],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder('desc');
    }
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

  const getInitials = (name: string) => {
    const parts = name.split(/[\s@]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-cyan-500 to-cyan-600',
      'from-red-500 to-red-600',
    ];
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleMailboxSelect = (id: string) => {
    setSelectedAccount(id);
    setShowMailboxDrawer(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-950 md:bg-gradient-to-br md:from-slate-100 md:via-blue-50/30 md:to-purple-50/20 md:dark:from-slate-950 md:dark:via-slate-900 md:dark:to-slate-950 overflow-hidden">
      {/* Mobile Header - iOS Style */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <button
          onClick={() => setShowMailboxDrawer(true)}
          className="flex items-center gap-2 text-blue-400 font-semibold"
        >
          <span className="text-lg">{currentMailbox.label}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        <div className="text-slate-400 text-sm">{filteredThreads.length.toLocaleString()}</div>
      </div>

      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-60 flex-col m-3 mr-0 rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20">
          <div className="p-5 pb-3">
            <h2 className="text-[11px] font-bold text-slate-500/80 dark:text-white/40 uppercase tracking-widest">
              Mailboxes
            </h2>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {mailboxes.map((mb) => (
              <DesktopSidebarItem
                key={mb.id}
                icon={mb.icon}
                label={mb.label}
                count={mb.count}
                active={selectedAccount === mb.id}
                onClick={() => setSelectedAccount(mb.id)}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-white/30 dark:border-white/5">
            <div className="text-[11px] text-slate-500/70 dark:text-white/30 text-center font-medium">
              {loadedEmails.toLocaleString()} of {totalEmails.toLocaleString()}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row md:p-3 md:gap-3 min-w-0">
          {/* Message List */}
          <div
            className={`w-full md:w-[400px] flex flex-col md:rounded-2xl bg-slate-950 md:bg-white/60 md:dark:bg-white/5 md:backdrop-blur-2xl md:border md:border-white/80 md:dark:border-white/10 md:shadow-xl overflow-hidden ${isMobileDetail ? 'hidden md:flex' : 'flex'}`}
          >
            {/* Search Bar - iOS Style */}
            <div className="p-3 bg-slate-900 md:bg-transparent md:p-4 md:border-b md:border-black/5 md:dark:border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 md:text-slate-400 md:dark:text-white/40" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 md:bg-black/5 md:dark:bg-white/10 rounded-lg text-sm text-white md:text-slate-900 md:dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-500 md:placeholder-slate-400 md:dark:placeholder-white/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Gmail-Style Category Tabs */}
            <div className="flex border-b border-slate-800 md:border-black/5 md:dark:border-white/5 bg-slate-900/50 md:bg-transparent overflow-x-auto">
              <CategoryTab
                icon={Users}
                label="Primary"
                count={categoryCounts.primary}
                active={activeCategory === 'primary'}
                onClick={() => setActiveCategory('primary')}
                color="blue"
                description="Real people & known entities"
              />
              <CategoryTab
                icon={Bell}
                label="Updates"
                count={categoryCounts.updates}
                active={activeCategory === 'updates'}
                onClick={() => setActiveCategory('updates')}
                color="yellow"
                description="Orders & notifications"
              />
              <CategoryTab
                icon={Tag}
                label="Promotions"
                count={categoryCounts.promotions}
                active={activeCategory === 'promotions'}
                onClick={() => setActiveCategory('promotions')}
                color="green"
                description="Newsletters & marketing"
              />
              <CategoryTab
                icon={Inbox}
                label="All"
                count={categoryCounts.all}
                active={activeCategory === 'all'}
                onClick={() => setActiveCategory('all')}
                color="slate"
                description="Everything"
              />
            </div>

            {/* Sort Header - Hidden on Mobile */}
            <div className="hidden md:flex px-5 py-3 items-center justify-between text-[11px] text-slate-500 dark:text-white/40 border-b border-black/5 dark:border-white/5 font-semibold uppercase tracking-wide">
              <span>{filteredThreads.length.toLocaleString()} conversations</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleSort('date')}
                  className={`flex items-center gap-1.5 transition-colors ${sortField === 'date' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-700 dark:hover:text-white/60'}`}
                >
                  <Clock className="w-3.5 h-3.5" /> Date
                </button>
                <button
                  onClick={() => handleSort('sender')}
                  className={`flex items-center gap-1.5 transition-colors ${sortField === 'sender' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-700 dark:hover:text-white/60'}`}
                >
                  <User className="w-3.5 h-3.5" /> From
                </button>
              </div>
            </div>

            {/* Message List */}
            <div ref={listRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
              {loading ? (
                <div className="p-10 text-center text-slate-500">
                  <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin opacity-40" />
                  <div className="font-medium">Loading messages...</div>
                </div>
              ) : (
                <>
                  {filteredThreads.map((thread) => (
                    <IOSMessageRow
                      key={thread.id}
                      thread={thread}
                      selected={selectedThreadId === thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      formatDate={formatDate}
                      getInitials={getInitials}
                      getAvatarColor={getAvatarColor}
                    />
                  ))}
                  {loadingMore && (
                    <div className="p-5 text-center">
                      <Loader2 className="w-5 h-5 mx-auto animate-spin text-blue-500/50" />
                    </div>
                  )}
                  {hasMore && !loadingMore && (
                    <div className="p-5 text-center">
                      <button
                        onClick={loadMoreEmails}
                        className="text-sm text-blue-400 font-medium"
                      >
                        Load more ({(totalEmails - loadedEmails).toLocaleString()} remaining)
                      </button>
                    </div>
                  )}
                  {!hasMore && loadedEmails > 0 && (
                    <div className="p-5 text-center text-[11px] text-slate-600 font-medium">
                      All {loadedEmails.toLocaleString()} emails loaded
                    </div>
                  )}
                </>
              )}
              {!loading && filteredThreads.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  <Mail className="w-14 h-14 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">No messages found</p>
                </div>
              )}
            </div>
          </div>

          {/* Thread Detail View */}
          <div
            className={`flex-1 flex flex-col bg-slate-950 md:rounded-2xl md:bg-white/60 md:dark:bg-white/5 md:backdrop-blur-2xl md:border md:border-white/80 md:dark:border-white/10 md:shadow-xl overflow-hidden ${!selectedThreadId ? 'hidden md:flex' : 'flex'}`}
          >
            {selectedThread ? (
              <>
                {/* iOS-Style Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900 md:bg-gradient-to-b md:from-white/50 md:to-transparent md:dark:from-white/5 border-b border-slate-800 md:border-black/5 md:dark:border-white/5">
                  <button
                    className="flex items-center text-blue-400 md:text-blue-600 md:dark:text-blue-400 font-semibold"
                    onClick={() => setSelectedThreadId(null)}
                  >
                    <ChevronLeft className="w-5 h-5 -ml-1" />
                    <span className="text-sm">{currentMailbox.label}</span>
                  </button>
                  <div className="flex items-center gap-4">
                    <button className="text-blue-400 md:text-slate-500 md:dark:text-white/50">
                      <Archive className="w-5 h-5" />
                    </button>
                    <button className="text-blue-400 md:text-slate-500 md:dark:text-white/50">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button className="text-blue-400 md:text-slate-500 md:dark:text-white/50">
                      <Reply className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Thread Subject */}
                <div className="px-4 py-4 bg-slate-900/50 md:bg-transparent md:px-6 md:py-5 border-b border-slate-800 md:border-black/5 md:dark:border-white/5">
                  <h1 className="text-xl md:text-2xl font-bold text-white md:text-slate-800 md:dark:text-white leading-tight">
                    {selectedThread.subject}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 md:text-slate-500 md:dark:text-white/50">
                    <span>
                      {selectedThread.messages.length} message
                      {selectedThread.messages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto">
                  {selectedThread.messages.map((msg, idx) => (
                    <IOSMessageBubble
                      key={msg.id}
                      email={msg}
                      expanded={idx === selectedThread.messages.length - 1}
                      getInitials={getInitials}
                      getAvatarColor={getAvatarColor}
                    />
                  ))}
                </div>

                {/* Bottom Action Bar - Mobile Only */}
                <div className="md:hidden flex items-center justify-around py-3 bg-slate-900 border-t border-slate-800">
                  <button className="flex flex-col items-center text-blue-400">
                    <Archive className="w-6 h-6" />
                    <span className="text-[10px] mt-1">Archive</span>
                  </button>
                  <button className="flex flex-col items-center text-blue-400">
                    <Trash2 className="w-6 h-6" />
                    <span className="text-[10px] mt-1">Delete</span>
                  </button>
                  <button className="flex flex-col items-center text-blue-400">
                    <Reply className="w-6 h-6" />
                    <span className="text-[10px] mt-1">Reply</span>
                  </button>
                  <button className="flex flex-col items-center text-blue-400">
                    <Forward className="w-6 h-6" />
                    <span className="text-[10px] mt-1">Forward</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center bg-gradient-to-b from-slate-50/30 to-transparent dark:from-transparent">
                <div className="text-center text-slate-400 dark:text-white/20">
                  <Mail className="w-20 h-20 mx-auto mb-5 opacity-15" />
                  <p className="text-lg font-semibold">Select a message to read</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mailbox Drawer - Mobile Only */}
      <AnimatePresence>
        {showMailboxDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setShowMailboxDrawer(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl z-50 md:hidden max-h-[70vh] overflow-hidden"
            >
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>
              <div className="px-4 pb-2">
                <h2 className="text-lg font-bold text-white">Mailboxes</h2>
              </div>
              <div className="overflow-y-auto pb-8">
                {mailboxes.map((mb) => (
                  <button
                    key={mb.id}
                    onClick={() => handleMailboxSelect(mb.id)}
                    className={`w-full flex items-center justify-between px-4 py-4 border-b border-slate-800 ${
                      selectedAccount === mb.id ? 'bg-blue-600/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <mb.icon
                        className={`w-5 h-5 ${selectedAccount === mb.id ? 'text-blue-400' : 'text-slate-400'}`}
                      />
                      <span
                        className={`font-medium ${selectedAccount === mb.id ? 'text-blue-400' : 'text-white'}`}
                      >
                        {mb.label}
                      </span>
                    </div>
                    {mb.count !== undefined && (
                      <span className="text-slate-500 text-sm">{mb.count.toLocaleString()}</span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- iOS-Style Components ---

const DesktopSidebarItem = ({ icon: Icon, label, count, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
        : 'text-slate-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon
        className={`w-[18px] h-[18px] ${active ? 'text-white' : 'text-slate-400 dark:text-white/40'}`}
      />
      <span>{label}</span>
    </div>
    {count !== undefined && (
      <span
        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${active ? 'bg-white/25' : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-white/50'}`}
      >
        {count.toLocaleString()}
      </span>
    )}
  </button>
);

const IOSMessageRow = React.memo(
  ({
    thread,
    selected,
    onClick,
    formatDate,
    getInitials,
    getAvatarColor,
  }: {
    thread: Thread;
    selected: boolean;
    onClick: () => void;
    formatDate: (d: string) => string;
    getInitials: (name: string) => string;
    getAvatarColor: (name: string) => string;
  }) => {
    const sender = thread.participantNames[0] || 'Unknown';

    return (
      <div
        onClick={onClick}
        className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors ${
          selected
            ? 'bg-blue-600/20 border-blue-800/50 md:bg-gradient-to-r md:from-blue-500 md:to-blue-600 md:border-transparent'
            : 'border-slate-800 md:border-black/5 md:dark:border-white/5 hover:bg-slate-800/50 md:hover:bg-black/[0.02] md:dark:hover:bg-white/[0.03]'
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(sender)} flex items-center justify-center text-white text-sm font-bold shrink-0`}
        >
          {getInitials(sender)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span
              className={`font-semibold text-[15px] truncate ${selected ? 'text-blue-300 md:text-white' : 'text-white md:text-slate-800 md:dark:text-white'}`}
            >
              {sender}
            </span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span
                className={`text-xs ${selected ? 'text-blue-300/80 md:text-white/80' : 'text-slate-500 md:text-slate-400 md:dark:text-white/40'}`}
              >
                {formatDate(thread.lastMessageDate)}
              </span>
              <ChevronRight
                className={`w-4 h-4 ${selected ? 'text-blue-300/60 md:text-white/60' : 'text-slate-600 md:text-slate-300 md:dark:text-white/20'}`}
              />
            </div>
          </div>
          <div
            className={`text-sm truncate mb-0.5 ${selected ? 'text-blue-200 md:text-white/90' : 'text-slate-300 md:text-slate-700 md:dark:text-white/80'}`}
          >
            {thread.subject}
          </div>
          <div
            className={`text-sm truncate ${selected ? 'text-blue-200/60 md:text-white/70' : 'text-slate-500 md:text-slate-400 md:dark:text-white/40'}`}
          >
            {thread.snippet}
          </div>
        </div>
      </div>
    );
  },
);

interface LinkedEntity {
  id: number;
  name: string;
  type: string;
  confidence: number;
}

const IOSMessageBubble = ({
  email,
  expanded,
  getInitials,
  getAvatarColor,
  onEntityClick,
}: {
  email: Email;
  expanded: boolean;
  getInitials: (name: string) => string;
  getAvatarColor: (name: string) => string;
  onEntityClick?: (entityId: number, entityName: string) => void;
}) => {
  const [isExpanded, setExpanded] = useState(expanded);
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const sender = email.sender || 'Unknown';

  // Load entities when expanded
  useEffect(() => {
    if (isExpanded && linkedEntities.length === 0 && !loadingEntities) {
      loadEmailEntities();
    }
  }, [isExpanded]);

  const loadEmailEntities = async () => {
    setLoadingEntities(true);
    try {
      const res = await fetch(`/api/emails/${email.id}/entities`);
      if (res.ok) {
        const data = await res.json();
        setLinkedEntities(data.entities || []);
      }
    } catch (e) {
      console.error('Failed to load email entities:', e);
    } finally {
      setLoadingEntities(false);
    }
  };

  return (
    <div className="border-b border-slate-800 md:border-black/5 md:dark:border-white/5">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-800/30 md:hover:bg-black/[0.02] md:dark:hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!isExpanded)}
      >
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(sender)} flex items-center justify-center text-white text-sm font-bold shrink-0`}
        >
          {getInitials(sender)}
        </div>

        {/* Header */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white md:text-slate-800 md:dark:text-white truncate">
                {sender}
              </span>
              {/* Known Entity Badge */}
              {email.isFromKnownEntity && (
                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-semibold rounded-full">
                  {email.knownEntityName || 'Known'}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 md:text-slate-400 md:dark:text-white/40 ml-2 shrink-0">
              {new Date(email.date).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="text-sm text-slate-400 md:text-slate-500 md:dark:text-white/50 truncate">
            To: {email.recipient || 'Unknown'}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 md:pl-[68px]">
              {/* Linked Entities Section */}
              {(linkedEntities.length > 0 || loadingEntities) && (
                <div className="mb-3 p-3 bg-slate-800/50 md:bg-slate-100 md:dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 md:text-slate-500 md:dark:text-white/50 mb-2">
                    <Link2 className="w-3.5 h-3.5" />
                    Mentioned Entities
                  </div>
                  {loadingEntities ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading entities...
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {linkedEntities.map((entity, idx) => (
                        <button
                          key={`${entity.id}-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEntityClick?.(entity.id, entity.name);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium rounded-full transition-colors"
                          title={`View ${entity.name} (${entity.type})`}
                        >
                          <User className="w-3 h-3" />
                          {entity.name}
                          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Email Content */}
              <div className="text-sm text-slate-300 md:text-slate-600 md:dark:text-white/70 whitespace-pre-wrap leading-relaxed">
                {email.content || email.summary || 'No content available'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Gmail-style Category Tab Component
const CategoryTab = ({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  color,
  description,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  color: 'blue' | 'yellow' | 'green' | 'slate';
  description?: string;
}) => {
  const colorClasses = {
    blue: 'text-blue-500 border-blue-500',
    yellow: 'text-yellow-500 border-yellow-500',
    green: 'text-green-500 border-green-500',
    slate: 'text-slate-400 border-slate-400',
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[80px] px-3 py-3 flex flex-col items-center gap-1 border-b-2 transition-all ${
        active
          ? `${colorClasses[color]} bg-slate-800/50 md:bg-black/5 md:dark:bg-white/5`
          : 'border-transparent text-slate-500 md:text-slate-400 md:dark:text-white/40 hover:text-slate-300 md:hover:text-slate-600 md:dark:hover:text-white/60 hover:bg-slate-800/30 md:hover:bg-black/[0.02] md:dark:hover:bg-white/[0.02]'
      }`}
      title={description}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-[10px] font-medium ${
          active ? '' : 'text-slate-600 md:text-slate-400 md:dark:text-white/30'
        }`}>
          {count.toLocaleString()}
        </span>
      )}
    </button>
  );
};

export default EmailClient;
