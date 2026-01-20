/**
 * Evidence Detail Page
 *
 * Displays evidence with type-specific viewers and linked entities
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Tag,
  AlertTriangle,
  Users,
  Download,
  Share2,
  Bookmark,
  ChevronLeft,
} from 'lucide-react';
import { EmailViewer } from '../components/evidence/EmailViewer';
import { DepositionViewer } from '../components/evidence/DepositionViewer';
import { TableViewer } from '../components/evidence/TableViewer';
import { ImageViewer } from '../components/evidence/ImageViewer';
import { DocumentViewer } from '../components/evidence/DocumentViewer';
import { ContactListViewer } from '../components/evidence/ContactListViewer';
import { getEntityCategoryIcon } from '../config/entityIcons';

interface Evidence {
  id: number;
  evidenceType: string;
  title: string;
  description: string;
  originalFilename: string;
  sourcePath: string;
  extractedText: string;
  createdAt: string;
  modifiedAt: string;
  redFlagRating: number;
  tags: string[];
  metadata: any;
  entities: Array<{
    id: number;
    name: string;
    category: string;
    role: string;
    confidence: number;
    contextSnippet: string;
  }>;
  wordCount: number;
  fileSize: number;
}

export function EvidenceDetail() {
  const { id } = useParams<{ id: string }>();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchEvidence is stable and only depends on id
  }, [id]);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/evidence/${id}`);

      if (!response.ok) {
        throw new Error('Evidence not found');
      }

      const data = await response.json();
      setEvidence(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  };

  const renderViewer = () => {
    if (!evidence) return null;

    switch (evidence.evidenceType) {
      case 'correspondence':
        return <EmailViewer evidence={evidence} />;
      case 'court_deposition':
        return <DepositionViewer evidence={evidence} />;
      case 'financial_record':
        return <TableViewer evidence={evidence} />;
      case 'contact_directory':
        return <ContactListViewer evidence={evidence} />;
      case 'media_scan':
        return <ImageViewer evidence={evidence} />;
      default:
        return <DocumentViewer evidence={evidence} />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRedFlagColor = (rating: number): string => {
    if (rating >= 4) return 'text-red-600 bg-red-50';
    if (rating >= 2) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getEvidenceTypeLabel = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evidence...</p>
        </div>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">{error || 'Evidence not found'}</p>
          <Link to="/evidence" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Evidence List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/evidence" className="text-gray-600 hover:text-gray-900 flex items-center">
                <ChevronLeft className="h-5 w-5" />
                <span className="ml-1">Back</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{evidence.title}</h1>
                <p className="text-xs font-light text-gray-500 mt-1 truncate">
                  {evidence.originalFilename}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                <Bookmark className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <FileText className="h-4 w-4 mr-1" />
                {getEvidenceTypeLabel(evidence.evidenceType)}
              </span>

              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRedFlagColor(evidence.redFlagRating)}`}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Red Flag: {evidence.redFlagRating}/5
              </span>

              {evidence.createdAt && (
                <span className="inline-flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(evidence.createdAt)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{evidence.wordCount?.toLocaleString()} words</span>
              <span>{formatFileSize(evidence.fileSize)}</span>
            </div>
          </div>

          {evidence.tags && evidence.tags.length > 0 && (
            <div className="mt-3 flex items-center space-x-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <div className="flex flex-wrap gap-2">
                {evidence.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">{renderViewer()}</div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Linked Entities */}
            {evidence.entities && evidence.entities.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Linked Entities ({evidence.entities.length})
                </h3>
                <div className="space-y-3">
                  {evidence.entities.map((entity) => {
                    const iconConfig = getEntityCategoryIcon(entity.category || 'person_associate');
                    return (
                      <Link
                        key={entity.id}
                        to={`/entities/${entity.id}`}
                        className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {entity.name}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">Role: {entity.role}</p>
                            {entity.confidence < 1 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Confidence: {(entity.confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                          <span className={`text-sm ${iconConfig.color}`}>{iconConfig.icon}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metadata */}
            {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Metadata</h3>
                <dl className="space-y-2 text-sm">
                  {Object.entries(evidence.metadata).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-gray-600 font-medium">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </dt>
                      <dd className="text-gray-900 mt-1">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
