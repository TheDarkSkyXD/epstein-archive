import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { DocumentProcessor } from '../../services/documentProcessor';

interface DocumentUploaderProps {
  processor: DocumentProcessor;
  onDocumentsLoaded: (count: number) => void;
  showUpload?: boolean; // Control visibility of upload functionality
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  processor,
  onDocumentsLoaded,
  showUpload = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) =>
        file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md'),
    );

    if (files.length === 0) {
      setError('Please drop text files (.txt, .md) only');
      setUploadStatus('error');
      return;
    }

    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (file) =>
        file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md'),
    );

    if (files.length === 0) {
      setError('Please select text files (.txt, .md) only');
      setUploadStatus('error');
      return;
    }

    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    setUploadStatus('processing');
    setError('');
    setProcessedCount(0);

    try {
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const content = await file.text();
          return {
            path: file.name,
            content: content,
          };
        }),
      );

      const documents = await processor.processDocumentBatch(fileContents);
      setProcessedCount(documents.length);
      setUploadStatus('success');
      onDocumentsLoaded(documents.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process documents');
      setUploadStatus('error');
    }
  };

  const resetUploader = () => {
    setUploadStatus('idle');
    setError('');
    setProcessedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5" />
        Upload Real Documents
      </h3>

      {!showUpload && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4">
          <p className="text-yellow-200 text-sm">
            Document upload is restricted to administrators. Please contact an admin if you need to
            upload documents.
          </p>
        </div>
      )}

      {uploadStatus === 'idle' && showUpload && (
        <div>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white mb-2">Drag and drop text files here</p>
            <p className="text-gray-400 text-sm mb-4">or click to browse</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Supported formats: .txt, .md files. Upload actual Epstein documents to analyse them.
          </p>
        </div>
      )}

      {uploadStatus === 'processing' && showUpload && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Processing documents...</p>
          <p className="text-gray-400 text-sm">Analyzing content and extracting entities</p>
        </div>
      )}

      {uploadStatus === 'success' && showUpload && (
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Success!</p>
          <p className="text-gray-400">Processed {processedCount} documents</p>
          <button
            onClick={resetUploader}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Upload More
          </button>
        </div>
      )}

      {uploadStatus === 'error' && showUpload && (
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 text-lg font-semibold">Error</p>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={resetUploader}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
