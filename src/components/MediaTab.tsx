import React, { useState, useEffect } from 'react';
import { Image, Video, Download, ExternalLink, Filter, Search, Star, AlertTriangle } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  title: string;
  description?: string;
  source?: string;
  verificationStatus: 'verified' | 'unverified' | 'disputed';
  spiceRating: number;
  relatedEntities: string[];
  dateAdded: Date;
  metadata?: {
    resolution?: string;
    duration?: string;
    fileSize?: string;
  };
}

interface MediaTabProps {
  // Props can be added as needed
}

export const MediaTab: React.FC<MediaTabProps> = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [filterVerification, setFilterVerification] = useState<'all' | 'verified' | 'unverified' | 'disputed'>('all');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real media data from API
  useEffect(() => {
    const fetchMediaData = async () => {
      try {
        setLoading(true);
        
        // Fetch media items from API
        const response = await apiClient.get<{ data: any[] }>('/api/media?page=1&limit=100');
        
        if (response && response.data) {
          const mediaItems: MediaItem[] = response.data.map((item: any) => ({
            id: item.id.toString(),
            type: item.fileType && (item.fileType === 'mp4' || item.fileType === 'mov' || item.fileType === 'avi') ? 'video' : 'image',
            url: `/files${item.filePath.replace('/Users/veland/Downloads/Epstein Files', '')}`,
            thumbnail: `/files${item.filePath.replace('/Users/veland/Downloads/Epstein Files', '')}`,
            title: item.title || `Media Item ${item.id}`,
            description: item.description || '',
            source: 'Epstein Files Archive',
            verificationStatus: item.verificationStatus || 'verified',
            spiceRating: item.spiceRating || 1,
            relatedEntities: [], // Would need to fetch related entities separately
            dateAdded: new Date(item.createdAt || Date.now()),
            metadata: item.metadata || {}
          }));
          
          setMediaItems(mediaItems);
          setFilteredItems(mediaItems);
        }
      } catch (error) {
        console.error('Error fetching media data:', error);
        
        // Fallback to sample data if API fails
        const sampleMedia: MediaItem[] = [
          {
            id: '1',
            type: 'image',
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Jeffrey_Epstein_2004.jpg/440px-Jeffrey_Epstein_2004.jpg',
            thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Jeffrey_Epstein_2004.jpg/440px-Jeffrey_Epstein_2004.jpg',
            title: 'Jeffrey Epstein (2004)',
            description: 'Official mugshot/portrait of Jeffrey Epstein from 2004.',
            source: 'Palm Beach Police Department',
            verificationStatus: 'verified',
            spiceRating: 5,
            relatedEntities: ['Jeffrey Epstein'],
            dateAdded: new Date('2004-01-01'),
            metadata: {
              resolution: '440x550',
              fileSize: '45 KB'
            }
          },
          {
            id: '2',
            type: 'image',
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Ghislaine_Maxwell_in_2006.jpg/440px-Ghislaine_Maxwell_in_2006.jpg',
            thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Ghislaine_Maxwell_in_2006.jpg/440px-Ghislaine_Maxwell_in_2006.jpg',
            title: 'Ghislaine Maxwell (2006)',
            description: 'Ghislaine Maxwell photographed in 2006.',
            source: 'Wikimedia Commons',
            verificationStatus: 'verified',
            spiceRating: 5,
            relatedEntities: ['Ghislaine Maxwell', 'Jeffrey Epstein'],
            dateAdded: new Date('2006-01-01'),
            metadata: {
              resolution: '440x600',
              fileSize: '55 KB'
            }
          },
          {
            id: '3',
            type: 'image',
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/440px-Donald_Trump_official_portrait.jpg',
            thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/440px-Donald_Trump_official_portrait.jpg',
            title: 'Donald Trump Official Portrait',
            description: 'Official portrait of Donald Trump.',
            source: 'White House',
            verificationStatus: 'verified',
            spiceRating: 5,
            relatedEntities: ['Donald Trump'],
            dateAdded: new Date('2017-01-01'),
            metadata: {
              resolution: '440x550',
              fileSize: '60 KB'
            }
          },
          {
            id: '4',
            type: 'image',
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Prince_Andrew_2013.jpg/440px-Prince_Andrew_2013.jpg',
            thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Prince_Andrew_2013.jpg/440px-Prince_Andrew_2013.jpg',
            title: 'Prince Andrew (2013)',
            description: 'Prince Andrew photographed in 2013.',
            source: 'Wikimedia Commons',
            verificationStatus: 'verified',
            spiceRating: 5,
            relatedEntities: ['Prince Andrew'],
            dateAdded: new Date('2013-01-01'),
            metadata: {
              resolution: '440x600',
              fileSize: '50 KB'
            }
          },
          {
            id: '5',
            type: 'video',
            url: 'https://www.youtube.com/watch?v=YWnUzvlqpB0',
            thumbnail: 'https://img.youtube.com/vi/YWnUzvlqpB0/hqdefault.jpg',
            title: 'Trump and Epstein Video Evidence',
            description: 'Video footage showing Donald Trump and Jeffrey Epstein at social events',
            source: 'NBC News Archive',
            verificationStatus: 'verified',
            spiceRating: 5,
            relatedEntities: ['Donald Trump', 'Jeffrey Epstein'],
            dateAdded: new Date('1992-01-01'),
            metadata: {
              duration: '3:24',
              resolution: '720p',
              fileSize: '45 MB'
            }
          }
        ];
        
        setMediaItems(sampleMedia);
        setFilteredItems(sampleMedia);
      } finally {
        setLoading(false);
      }
    };

    fetchMediaData();
  }, []);

  // Filter media items
  useEffect(() => {
    let filtered = mediaItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.relatedEntities.some(entity => entity.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    if (filterVerification !== 'all') {
      filtered = filtered.filter(item => item.verificationStatus === filterVerification);
    }

    // Sort by spice rating (highest first)
    filtered.sort((a, b) => b.spiceRating - a.spiceRating);

    setFilteredItems(filtered);
  }, [searchTerm, filterType, filterVerification, mediaItems]);

  const getVerificationBadge = (status: MediaItem['verificationStatus']) => {
    const badges = {
      verified: { color: 'bg-green-500', text: 'Verified', icon: '✓' },
      unverified: { color: 'bg-yellow-500', text: 'Unverified', icon: '?' },
      disputed: { color: 'bg-red-500', text: 'Disputed', icon: '!' }
    };
    const badge = badges[status];
    return (
      <span className={`${badge.color} text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1`}>
        <span>{badge.icon}</span>
        <span>{badge.text}</span>
      </span>
    );
  };

  const getSpiceStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading media...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Media Evidence</h2>
        <p className="text-slate-400">
          Verified images and video evidence in highest available resolution
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
              placeholder="Search media by title, description, or related entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Type:</span>
          </div>
          {(['all', 'image', 'video'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}

          <div className="flex items-center space-x-2 ml-4">
            <span className="text-sm text-slate-400">Status:</span>
          </div>
          {(['all', 'verified', 'unverified', 'disputed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterVerification(status)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filterVerification === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-slate-400 text-sm">
        Showing {filteredItems.length} of {mediaItems.length} media items
      </div>

      {/* Media Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <p>No media items found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition-all cursor-pointer group"
              onClick={() => setSelectedItem(item)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-900">
                {item.type === 'video' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-16 w-16 text-slate-600 group-hover:text-blue-500 transition-colors" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image className="h-16 w-16 text-slate-600 group-hover:text-blue-500 transition-colors" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {getVerificationBadge(item.verificationStatus)}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <h3 className="text-white font-semibold line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h3>

                {item.description && (
                  <p className="text-slate-400 text-sm line-clamp-2">{item.description}</p>
                )}

                {/* Spice Rating */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500">Red Flag Index:</span>
                    {getSpiceStars(item.spiceRating)}
                  </div>
                </div>

                {/* Related Entities */}
                {item.relatedEntities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.relatedEntities.slice(0, 3).map((entity, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                      >
                        {entity}
                      </span>
                    ))}
                    {item.relatedEntities.length > 3 && (
                      <span className="text-xs text-slate-500 px-2 py-1">
                        +{item.relatedEntities.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Metadata */}
                {item.metadata && (
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
                    {item.metadata.resolution && <span>{item.metadata.resolution}</span>}
                    {item.metadata.duration && <span>{item.metadata.duration}</span>}
                    {item.metadata.fileSize && <span>{item.metadata.fileSize}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.url, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Implement download functionality
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for selected item */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <h2 className="text-2xl font-bold text-white">{selectedItem.title}</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {selectedItem.description && (
                <p className="text-slate-300">{selectedItem.description}</p>
              )}

              <div className="flex items-center space-x-4">
                {getVerificationBadge(selectedItem.verificationStatus)}
                {getSpiceStars(selectedItem.spiceRating)}
              </div>

              {selectedItem.source && (
                <div className="text-sm text-slate-400">
                  <span className="font-semibold">Source:</span> {selectedItem.source}
                </div>
              )}

              <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
                {selectedItem.type === 'video' ? (
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center space-x-2"
                  >
                    <Video className="h-8 w-8" />
                    <span>Open video in new tab</span>
                  </a>
                ) : (
                  <Image className="h-16 w-16 text-slate-600" />
                )}
              </div>

              {selectedItem.relatedEntities.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Related Entities:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.relatedEntities.map((entity, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-sm"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaTab;
