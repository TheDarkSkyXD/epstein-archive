import React, { useState, useRef, useEffect } from 'react';
import { Annotation, TextPosition } from '../types/investigation';
import { Highlighter, MessageSquare, Tag, Flag, CheckCircle, XCircle } from 'lucide-react';

interface DocumentAnnotationSystemProps {
  documentId: string;
  content: string;
  annotations?: Annotation[];
  currentUserId?: string;
  searchTerm?: string;
  renderHighlightedText?: (text: string, term?: string) => React.ReactNode;
  mode?: 'inline' | 'full';
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAnnotationUpdate?: (annotationId: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete?: (annotationId: string) => void;
}

export const DocumentAnnotationSystem: React.FC<DocumentAnnotationSystemProps> = ({
  documentId,
  content,
  annotations: externalAnnotations,
  currentUserId = 'investigator-001',
  searchTerm,
  renderHighlightedText,
  mode = 'inline',
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
}) => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<TextPosition | null>(null);
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // Use external annotations if provided, otherwise use local state
  const annotations = externalAnnotations || localAnnotations;

  // Mock annotations for demonstration
  useEffect(() => {
    if (!externalAnnotations && localAnnotations.length === 0) {
      const mockAnnotations: Annotation[] = [
        {
          id: 'annotation-001',
          documentId: documentId,
          position: { start: 100, end: 114 },
          type: 'evidence',
          content: 'Primary subject of investigation',
          tags: ['target', 'key-person'],
          investigatorId: 'investigator-001',
          visibility: 'team',
          relatedAnnotations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'annotation-002',
          documentId: documentId,
          position: { start: 250, end: 270 },
          type: 'highlight',
          content: 'Potential money laundering evidence',
          tags: ['financial', 'evidence'],
          investigatorId: 'investigator-002',
          visibility: 'team',
          relatedAnnotations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      setLocalAnnotations(mockAnnotations);
    }
  }, [documentId, externalAnnotations, localAnnotations.length]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) {
      setSelectedText('');
      setShowAnnotationMenu(false);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length > 0) {
      setSelectedText(selectedText);

      // Get selection position
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate position relative to content container
      const containerRect = contentRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 40,
      });

      // Calculate text position for annotation
      const textContent = contentRef.current.textContent || '';
      const startOffset = getTextOffset(range.startContainer, range.startOffset);
      const endOffset = startOffset + selectedText.length;

      setSelectionPosition({
        start: startOffset,
        end: endOffset,
      });

      setShowAnnotationMenu(true);
    } else {
      setSelectedText('');
      setShowAnnotationMenu(false);
    }
  };

  const getTextOffset = (node: Node, offset: number): number => {
    let textOffset = 0;
    const walker = document.createTreeWalker(contentRef.current!, NodeFilter.SHOW_TEXT, null);

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node) {
        return textOffset + offset;
      }
      textOffset += currentNode.textContent?.length || 0;
    }
    return textOffset;
  };

  const createAnnotation = (type: Annotation['type'], content: string) => {
    if (!selectionPosition) return;

    const annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'> = {
      documentId,
      investigatorId: currentUserId,
      type,
      content,
      position: selectionPosition,
      tags: [],
      visibility: 'private',
      evidenceRating: type === 'evidence' ? 'supporting' : undefined,
      relatedAnnotations: [],
    };

    if (onAnnotationCreate) {
      onAnnotationCreate(annotation);
    } else {
      // Create annotation locally
      const newAnnotation: Annotation = {
        ...annotation,
        id: `annotation-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setLocalAnnotations((prev) => [...prev, newAnnotation]);
    }

    setShowAnnotationMenu(false);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const getAnnotationColor = (type: Annotation['type']) => {
    switch (type) {
      case 'highlight':
        return 'bg-yellow-200 text-yellow-800';
      case 'note':
        return 'bg-blue-200 text-blue-800';
      case 'tag':
        return 'bg-green-200 text-green-800';
      case 'question':
        return 'bg-purple-200 text-purple-800';
      case 'evidence':
        return 'bg-red-200 text-red-800';
      case 'contradiction':
        return 'bg-orange-200 text-orange-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getAnnotationIcon = (type: Annotation['type']) => {
    switch (type) {
      case 'highlight':
        return Highlighter;
      case 'note':
        return MessageSquare;
      case 'tag':
        return Tag;
      case 'question':
        return Flag;
      case 'evidence':
        return CheckCircle;
      case 'contradiction':
        return XCircle;
      default:
        return MessageSquare;
    }
  };

  const renderHighlightedContent = () => {
    if (!content || !contentRef.current) return content;

    let result = content;

    // First apply search term highlighting if provided
    if (searchTerm && renderHighlightedText) {
      const highlighted = renderHighlightedText(content, searchTerm);
      if (typeof highlighted === 'string') {
        result = highlighted;
      } else {
        // If renderHighlightedText returns JSX, we need to handle it differently
        // For now, just use the original content
        result = content;
      }
    }

    // Sort annotations by start position
    const sortedAnnotations = [...annotations].sort(
      (a, b) => (a.position?.start || 0) - (b.position?.start || 0),
    );

    let offset = 0;

    sortedAnnotations.forEach((annotation) => {
      if (!annotation.position) return;

      const { start, end } = annotation.position;
      const beforeText = result.substring(0, start + offset);
      const highlightedText = result.substring(start + offset, end + offset);
      const afterText = result.substring(end + offset);

      const annotationClass = getAnnotationColor(annotation.type)
        .replace('bg-', 'bg-opacity-30 ')
        .replace('text-', '');
      const IconComponent = getAnnotationIcon(annotation.type);

      result = `${beforeText}<span class="${annotationClass} cursor-pointer hover:bg-opacity-50 transition-colors" data-annotation-id="${annotation.id}">${highlightedText}</span>${afterText}`;
      offset += 40; // Account for added HTML
    });

    return result;
  };

  const handleAnnotationClick = (annotationId: string) => {
    const annotation = annotations.find((a) => a.id === annotationId);
    if (annotation) {
      setActiveAnnotation(annotation);
      setShowAnnotationPanel(true);
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      // Add click handlers to annotation spans
      const annotationSpans = contentRef.current.querySelectorAll('[data-annotation-id]');
      annotationSpans.forEach((span) => {
        span.addEventListener('click', () => {
          const annotationId = span.getAttribute('data-annotation-id');
          if (annotationId) handleAnnotationClick(annotationId);
        });
      });
    }

    return () => {
      if (contentRef.current) {
        const annotationSpans = contentRef.current.querySelectorAll('[data-annotation-id]');
        annotationSpans.forEach((span) => {
          span.replaceWith(span.textContent || '');
        });
      }
    };
  }, [content, annotations]);

  return (
    <div className={`relative ${mode === 'full' ? 'h-full flex' : ''}`}>
      <div className={`${mode === 'full' ? 'flex-1 pr-4' : 'w-full'}`}>
        {/* Document Content with Annotations */}
        <div
          ref={contentRef}
          className="prose prose-invert max-w-none text-slate-300 leading-relaxed select-text whitespace-pre-wrap"
          onMouseUp={handleTextSelection}
          dangerouslySetInnerHTML={{ __html: renderHighlightedContent() }}
        />

        {/* Annotation Menu */}
        {showAnnotationMenu && (
          <div
            className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex space-x-1">
              <button
                onClick={() => createAnnotation('highlight', selectedText)}
                className="p-2 hover:bg-slate-700 rounded text-yellow-400"
                title="Highlight"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              <button
                onClick={() => createAnnotation('note', selectedText)}
                className="p-2 hover:bg-slate-700 rounded text-blue-400"
                title="Add Note"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => createAnnotation('evidence', selectedText)}
                className="p-2 hover:bg-slate-700 rounded text-green-400"
                title="Mark as Evidence"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => createAnnotation('contradiction', selectedText)}
                className="p-2 hover:bg-slate-700 rounded text-red-400"
                title="Mark Contradiction"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {mode === 'inline' && (
          /* Annotation Summary - Only show in inline mode */
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">
                {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowAnnotationPanel(true)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View All
            </button>
          </div>
        )}
      </div>

      {mode === 'full' && (
        /* Annotation Sidebar - Only show in full mode */
        <div className="w-80 bg-slate-800 border-l border-slate-600 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Annotations</h3>
            <span className="text-sm text-slate-400">{annotations.length} total</span>
          </div>

          <div className="space-y-3">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="bg-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-600 transition-colors"
                onClick={() => {
                  setActiveAnnotation(annotation);
                  setShowAnnotationPanel(true);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {React.createElement(getAnnotationIcon(annotation.type), {
                      className: `w-4 h-4 ${getAnnotationColor(annotation.type).split(' ')[0].replace('bg-', 'text-')}`,
                    })}
                    <span className="text-sm font-medium text-white capitalize">
                      {annotation.type}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-slate-300 mb-2">"{annotation.content}"</div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{annotation.investigatorId}</span>
                  <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {annotations.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No annotations yet</p>
                <p className="text-xs mt-1">Select text to add annotations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Annotation Panel Modal */}
      {showAnnotationPanel && activeAnnotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {React.createElement(getAnnotationIcon(activeAnnotation.type), {
                  className: 'w-5 h-5',
                })}
                <h3 className="text-lg font-medium text-white capitalize">
                  {activeAnnotation.type}
                </h3>
              </div>
              <button
                onClick={() => setShowAnnotationPanel(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Annotation Content
                </label>
                <textarea
                  value={activeAnnotation.content}
                  onChange={(e) => {
                    if (onAnnotationUpdate) {
                      onAnnotationUpdate(activeAnnotation.id, { content: e.target.value });
                    } else {
                      // Update locally
                      setLocalAnnotations((prev) =>
                        prev.map((ann) =>
                          ann.id === activeAnnotation.id
                            ? { ...ann, content: e.target.value, updatedAt: new Date() }
                            : ann,
                        ),
                      );
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Evidence Rating
                </label>
                <select
                  value={activeAnnotation.evidenceRating || ''}
                  onChange={(e) => {
                    if (onAnnotationUpdate) {
                      onAnnotationUpdate(activeAnnotation.id, {
                        evidenceRating: e.target.value as any,
                      });
                    } else {
                      // Update locally
                      setLocalAnnotations((prev) =>
                        prev.map((ann) =>
                          ann.id === activeAnnotation.id
                            ? {
                                ...ann,
                                evidenceRating: e.target.value as any,
                                updatedAt: new Date(),
                              }
                            : ann,
                        ),
                      );
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select rating</option>
                  <option value="crucial">Crucial Evidence</option>
                  <option value="supporting">Supporting Evidence</option>
                  <option value="weak">Weak Evidence</option>
                  <option value="contradictory">Contradictory Evidence</option>
                  <option value="uncertain">Uncertain</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Visibility</label>
                <select
                  value={activeAnnotation.visibility}
                  onChange={(e) => {
                    if (onAnnotationUpdate) {
                      onAnnotationUpdate(activeAnnotation.id, {
                        visibility: e.target.value as any,
                      });
                    } else {
                      // Update locally
                      setLocalAnnotations((prev) =>
                        prev.map((ann) =>
                          ann.id === activeAnnotation.id
                            ? { ...ann, visibility: e.target.value as any, updatedAt: new Date() }
                            : ann,
                        ),
                      );
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="private">Private</option>
                  <option value="team">Team Only</option>
                  <option value="investigation">Investigation</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => {
                    if (onAnnotationDelete) {
                      onAnnotationDelete(activeAnnotation.id);
                    } else {
                      // Delete locally
                      setLocalAnnotations((prev) =>
                        prev.filter((ann) => ann.id !== activeAnnotation.id),
                      );
                    }
                    setShowAnnotationPanel(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowAnnotationPanel(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
