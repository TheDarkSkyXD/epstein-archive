import React, { useState, useEffect } from 'react';
import { Newspaper, Search, Filter } from 'lucide-react';
import ArticleViewerModal from './ArticleViewerModal';
import { ArticleCard, Article } from './ArticleCard';

export const ArticlesTab: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize from URL param
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });

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
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.tags.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedPublication !== 'all') {
      filtered = filtered.filter((article) => article.publication === selectedPublication);
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

  const publications = [
    'all',
    ...Array.from(new Set((articles || []).map((a) => a.publication).filter(Boolean))),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading articles...</div>
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
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Publication Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <select
              value={selectedPublication}
              onChange={(e) => setSelectedPublication(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {publications.map((pub) => (
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

      {/* Articles Grid - New Substack-style Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {filteredArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onClick={(a) => {
              setViewerArticle(a);
            }}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && (
        <div className="text-center py-12 text-slate-400 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <Newspaper className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <p className="text-lg text-slate-300">No articles found matching your criteria.</p>
          <p className="text-sm mt-2">Try adjusting your filters or search term.</p>
        </div>
      )}

      <ArticleViewerModal
        article={viewerArticle}
        highlight={searchTerm}
        onClose={() => setViewerArticle(null)}
      />
    </div>
  );
};

export default ArticlesTab;
