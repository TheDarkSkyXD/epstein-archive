import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Calendar, User, Tag, Search, Filter } from 'lucide-react';
import ArticleViewerModal from './ArticleViewerModal';

interface Article {
  id: number;
  title: string;
  url: string;
  author: string;
  publication: string;
  published_date: string;
  summary: string;
  tags: string;
  redFlagRating: number;
  created_at: string;
}

export const ArticlesTab: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPublication, setSelectedPublication] = useState<string>('all');
  const [viewerArticle, setViewerArticle] = useState<any | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [searchTerm, selectedPublication, articles]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/articles');
      
      if (!response.ok) {
        console.warn('Articles API not available, using empty array');
        setArticles([]);
        setFilteredArticles([]);
        return;
      }
      
      const data = await response.json();
      
      // Check if data is an array
      if (Array.isArray(data)) {
        setArticles(data);
        setFilteredArticles(data);
      } else {
        console.warn('Articles API returned non-array data:', data);
        setArticles([]);
        setFilteredArticles([]);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
      setFilteredArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedPublication !== 'all') {
      filtered = filtered.filter(article => article.publication === selectedPublication);
    }

    // Sort by Red Flag Index (highest first), then by date
    filtered.sort((a, b) => {
      if (b.redFlagRating !== a.redFlagRating) {
        return b.redFlagRating - a.redFlagRating;
      }
      return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
    });

    setFilteredArticles(filtered);
  };

  const publications = ['all', ...Array.from(new Set((articles || []).map(a => a.publication).filter(Boolean)))];

  const getSpicePeppers = (rating: number) => {
    return '🚩'.repeat(rating);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading articles...</div>
      </div>
    );
  }

  if (articles.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Newspaper className="w-8 h-8" />
            Investigative Articles
          </h2>
          <p className="text-slate-400">
            Curated journalism from Miami Herald and independent investigators
          </p>
        </div>
        <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
          <Newspaper className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 mb-2">No articles available yet.</p>
          <p className="text-slate-500 text-sm">Articles will appear here once they are imported.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Newspaper className="w-8 h-8" />
          Investigative Articles
        </h2>
        <p className="text-slate-400">
          Curated journalism from Miami Herald and independent investigators
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search articles by title, summary, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Publication Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <select
              value={selectedPublication}
              onChange={(e) => setSelectedPublication(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {publications.map(pub => (
                <option key={pub} value={pub}>
                  {pub === 'all' ? 'All Publications' : pub}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-slate-400 text-sm">
        Showing {filteredArticles.length} of {articles.length} articles
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            className="bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500 transition-all overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-semibold text-white line-clamp-2 flex-1">
                  {article.title}
                </h3>
                <span className="text-2xl flex-shrink-0" title={`Red Flag Index: ${article.redFlagRating}/5`}>
                  {getSpicePeppers(article.redFlagRating)}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Newspaper className="h-4 w-4" />
                  <span>{article.publication}</span>
                </div>
                {article.published_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(article.published_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <p className="text-slate-300 line-clamp-3">
                {article.summary}
              </p>

              {/* Tags */}
              {article.tags && (
                <div className="flex flex-wrap gap-2">
                  {article.tags.split(',').map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                    >
                      <Tag className="h-3 w-3" />
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                  onClick={async () => {
                    try {
                      const resp = await fetch(`/api/articles/${article.id}`)
                      if (resp.ok) {
                        const data = await resp.json()
                        setViewerArticle(data)
                      } else {
                        // Fallback: open external
                        window.open(article.url, '_blank')
                      }
                    } catch {
                      window.open(article.url, '_blank')
                    }
                  }}
                >
                  <span>View In App</span>
                </button>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <span>Open Source</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Newspaper className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <p>No articles found matching your criteria.</p>
        </div>
      )}
      <ArticleViewerModal article={viewerArticle} highlight={searchTerm} onClose={() => setViewerArticle(null)} />
    </div>
  );
};

export default ArticlesTab;
