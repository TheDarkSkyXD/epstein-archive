import React, { useState, useEffect, useMemo } from 'react';
import {
  Newspaper,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Clock,
} from 'lucide-react';
import ArticleViewerModal from './ArticleViewerModal';
import { Article } from './ArticleCard';

interface PublicationStats {
  name: string;
  count: number;
  avgRedFlag: number;
}

export const ArticlesTab: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPublication, setSelectedPublication] = useState<string | null>(null);
  const [viewerArticle, setViewerArticle] = useState<any | null>(null);
  const [showPublicationDropdown, setShowPublicationDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState<'date' | 'redFlag'>('redFlag');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/articles');

      if (!response.ok) {
        console.warn('Articles API not available, using empty array');
        setArticles([]);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setArticles(data);
      } else {
        console.warn('Articles API returned non-array data:', data);
        setArticles([]);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate publication stats (like albums)
  const publications = useMemo((): PublicationStats[] => {
    const pubMap = new Map<string, { count: number; totalRedFlag: number }>();
    for (const article of articles) {
      const pub = article.publication || 'Unknown';
      const existing = pubMap.get(pub) || { count: 0, totalRedFlag: 0 };
      pubMap.set(pub, {
        count: existing.count + 1,
        totalRedFlag: existing.totalRedFlag + (article.redFlagRating || 0),
      });
    }
    return Array.from(pubMap.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgRedFlag: stats.count > 0 ? stats.totalRedFlag / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let filtered = articles;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(search) ||
          (article.summary || '').toLowerCase().includes(search) ||
          (article.tags || '').toLowerCase().includes(search),
      );
    }

    if (selectedPublication) {
      filtered = filtered.filter((article) => article.publication === selectedPublication);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortOrder === 'redFlag') {
        if (b.redFlagRating !== a.redFlagRating) {
          return b.redFlagRating - a.redFlagRating;
        }
      }
      return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
    });

    return filtered;
  }, [articles, searchTerm, selectedPublication, sortOrder]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getRedFlagColor = (rating: number) => {
    if (rating >= 5) return 'text-red-400 bg-red-900/30';
    if (rating >= 4) return 'text-orange-400 bg-orange-900/30';
    if (rating >= 3) return 'text-yellow-400 bg-yellow-900/30';
    if (rating >= 2) return 'text-blue-400 bg-blue-900/30';
    return 'text-slate-400 bg-slate-800';
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden rounded-lg">
      {/* Header with controls */}
      <div className="bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-4 md:h-14 shrink-0 z-10 gap-2">
        {/* Mobile Publication Dropdown */}
        <div className="md:hidden">
          <button
            onClick={() => setShowPublicationDropdown(!showPublicationDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm h-8"
          >
            <span className="flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              {selectedPublication || 'All Publications'}
            </span>
            {showPublicationDropdown ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showPublicationDropdown && (
            <div className="absolute left-3 right-3 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
              <button
                className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between ${!selectedPublication ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                onClick={() => {
                  setSelectedPublication(null);
                  setShowPublicationDropdown(false);
                }}
              >
                <span>All Publications</span>
                <span className="text-xs opacity-70">{articles.length}</span>
              </button>
              {publications.map((pub) => (
                <button
                  key={pub.name}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between border-t border-slate-700/50 ${selectedPublication === pub.name ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                  onClick={() => {
                    setSelectedPublication(pub.name);
                    setShowPublicationDropdown(false);
                  }}
                >
                  <span className="truncate">{pub.name}</span>
                  <span className="text-xs opacity-70">{pub.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="w-full md:w-64 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-200 pl-9 pr-3 py-2 md:py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500 transition-all h-8"
            />
          </div>
        </div>

        {/* Desktop Sort Controls */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Sort by:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'date' | 'redFlag')}
            className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs px-2 py-1 focus:outline-none focus:border-cyan-500 h-8"
          >
            <option value="redFlag">Red Flag Rating</option>
            <option value="date">Date Published</option>
          </select>

          <div className="text-xs text-slate-500">
            {filteredArticles.length} of {articles.length} articles
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Publications sidebar - Hidden on mobile */}
        <aside className="hidden md:flex w-60 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
            Publications
          </h3>
          <div className="flex-1 overflow-y-auto">
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${!selectedPublication ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
              onClick={() => setSelectedPublication(null)}
            >
              <span className="truncate">All Publications</span>
              <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                {articles.length}
              </span>
            </button>
            {publications.map((pub) => (
              <button
                key={pub.name}
                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedPublication === pub.name ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
                onClick={() => setSelectedPublication(pub.name)}
                title={pub.name}
              >
                <span className="truncate">{pub.name}</span>
                <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                  {pub.count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          ) : null}

          {/* Articles Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Newspaper className="w-12 h-12 mb-2 opacity-50" />
                <p>No articles found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filteredArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setViewerArticle(article)}
                    className="group bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-all text-left"
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-cyan-400 truncate">
                              {article.publication}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${getRedFlagColor(article.redFlagRating)}`}
                            >
                              {'🚩'.repeat(article.redFlagRating || 0) || '—'}
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-cyan-400 transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 shrink-0" />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      <p className="text-slate-400 text-xs line-clamp-3 mb-3">
                        {article.summary || 'No summary available.'}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(article.published_date)}
                          </span>
                          {article.author && (
                            <span className="truncate max-w-[100px]">{article.author}</span>
                          )}
                        </div>
                        {(article.reading_time || article.readingTime) && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.reading_time || article.readingTime}
                          </span>
                        )}
                      </div>

                      {article.tags && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {article.tags
                            .split(',')
                            .slice(0, 3)
                            .map((tag, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ArticleViewerModal
        article={viewerArticle}
        highlight={searchTerm}
        onClose={() => setViewerArticle(null)}
      />
    </div>
  );
};

export default ArticlesTab;
