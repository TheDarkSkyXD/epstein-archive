import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { prettifyOCRText } from '../../utils/prettifyOCR';

interface InvestigationTextRendererProps {
  document: any;
  mode: 'clean' | 'ocr';
  searchTerm?: string;
  showRecoveryHighlights: boolean;
  onToggleRecoveryHighlights: (next: boolean) => void;
  onEntitySelect?: (entity: any) => void;
}

interface ParsedSection {
  id: string;
  title: string;
  body: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applySearchHighlight = (html: string, term?: string): string => {
  if (!term || term.trim().length < 2) return html;
  const tokens = term
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .map(escapeRegExp);
  if (tokens.length === 0) return html;

  const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
  return html.replace(
    regex,
    '<mark class="bg-yellow-500/45 text-slate-50 px-0.5 rounded">$1</mark>',
  );
};

const parseSections = (text: string): ParsedSection[] => {
  const lines = text.split('\n');
  const headingRegex = /^[A-Z][A-Z0-9\s\-\/:&]{5,}$/;
  const headingIndices: Array<{ index: number; title: string }> = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 90) return;
    if (!headingRegex.test(trimmed)) return;
    if (/^[0-9\W]+$/.test(trimmed)) return;
    headingIndices.push({ index, title: trimmed });
  });

  if (headingIndices.length < 2) {
    return [{ id: 'full', title: 'Document text', body: text }];
  }

  const sections: ParsedSection[] = [];
  for (let i = 0; i < headingIndices.length; i += 1) {
    const current = headingIndices[i];
    const next = headingIndices[i + 1];
    const bodyStart = current.index + 1;
    const bodyEnd = next ? next.index : lines.length;
    const body = lines.slice(bodyStart, bodyEnd).join('\n').trim();
    sections.push({
      id: `section-${i}`,
      title: current.title,
      body,
    });
  }

  return sections;
};

const getEntityList = (document: any): any[] => {
  const fromDocument = Array.isArray(document?.entities) ? document.entities : [];
  const fromMentioned = Array.isArray(document?.mentionedEntities)
    ? document.mentionedEntities
    : [];
  const combined = [...fromDocument, ...fromMentioned];

  const byName = new Map<string, any>();
  for (const entity of combined) {
    const name = String(entity?.full_name || entity?.name || '').trim();
    if (!name) continue;
    if (!byName.has(name.toLowerCase())) {
      byName.set(name.toLowerCase(), { ...entity, name });
    }
  }
  return Array.from(byName.values());
};

export const InvestigationTextRenderer: React.FC<InvestigationTextRendererProps> = ({
  document,
  mode,
  searchTerm,
  showRecoveryHighlights,
  onToggleRecoveryHighlights,
  onEntitySelect,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; entity: any } | null>(null);

  const entityList = useMemo(() => getEntityList(document), [document]);

  const baseText = useMemo(() => {
    const original = String(document?.content || '');
    if (mode === 'ocr') return original;
    if (document?.contentRefined && String(document.contentRefined).trim().length > 0) {
      return String(document.contentRefined);
    }
    return prettifyOCRText(original);
  }, [document, mode]);

  const sections = useMemo(() => parseSections(baseText), [baseText]);

  const baselineTokens = useMemo(() => {
    const raw = document?.unredaction_metrics?.baselineVocab;
    if (typeof raw !== 'string' || raw.trim().length === 0) return null;
    const set = new Set<string>();
    raw.split(/\s+/).forEach((token: string) => {
      const normalized = token.trim().toLowerCase();
      if (normalized) set.add(normalized);
    });
    return set;
  }, [document]);

  const entityRegex = useMemo(() => {
    const names = entityList
      .map((entity) => String(entity?.name || '').trim())
      .filter((name) => name.length >= 3)
      .sort((a, b) => b.length - a.length)
      .slice(0, 250)
      .map(escapeRegExp);

    if (names.length === 0) return null;
    return new RegExp(`\\b(${names.join('|')})\\b`, 'g');
  }, [entityList]);

  const entityByName = useMemo(() => {
    const map = new Map<string, any>();
    entityList.forEach((entity) => {
      map.set(String(entity.name).toLowerCase(), entity);
    });
    return map;
  }, [entityList]);

  const renderLineHtml = useCallback(
    (line: string): string => {
      let html = escapeHtml(line);

      if (mode === 'clean' && showRecoveryHighlights && baselineTokens) {
        html = html.replace(/([A-Za-z0-9']+)/g, (token) => {
          const normalized = token.toLowerCase();
          if (baselineTokens.has(normalized)) return token;
          return `<span class="border-b border-emerald-500/55" data-recovery="true">${token}</span>`;
        });
      }

      if (entityRegex) {
        html = html.replace(entityRegex, (match) => {
          const entity = entityByName.get(match.toLowerCase());
          if (!entity) return match;
          const id = String(entity.id ?? entity.entity_id ?? '');
          const safeName = escapeHtml(match);
          return `<button type="button" class="entity-inline text-cyan-300 underline decoration-cyan-500/60 underline-offset-2" data-entity-id="${id}" data-entity-name="${safeName}">${safeName}</button>`;
        });
      }

      html = applySearchHighlight(html, searchTerm);
      return html;
    },
    [baselineTokens, entityByName, entityRegex, mode, searchTerm, showRecoveryHighlights],
  );

  const processedSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        lines: section.body.split('\n').map((line) => renderLineHtml(line)),
      })),
    [renderLineHtml, sections],
  );

  const allLines = useMemo(() => {
    if (processedSections.length !== 1 || processedSections[0].id !== 'full') return [] as string[];
    return processedSections[0].lines;
  }, [processedSections]);

  const useVirtualization = false;
  const lineHeight = 24;
  const virtualStart = 0;
  const visibleLines = allLines;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const entityButton = target.closest('.entity-inline') as HTMLElement | null;
      if (!entityButton) {
        setHover((previous) => (previous ? null : previous));
        return;
      }
      const entityName = entityButton.getAttribute('data-entity-name') || '';
      const entityId = entityButton.getAttribute('data-entity-id') || '';
      const entity =
        entityByName.get(entityName.toLowerCase()) ||
        entityList.find((candidate) => String(candidate.id) === entityId);
      if (!entity) return;
      setHover({ x: event.clientX + 12, y: event.clientY + 10, entity });
    };

    const handleMouseLeave = () => setHover(null);

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const entityButton = target.closest('.entity-inline') as HTMLElement | null;
      if (!entityButton || !onEntitySelect) return;
      event.preventDefault();
      const entityName = entityButton.getAttribute('data-entity-name') || '';
      const entityId = entityButton.getAttribute('data-entity-id') || '';
      const entity =
        entityByName.get(entityName.toLowerCase()) ||
        entityList.find((candidate) => String(candidate.id) === entityId);
      if (entity) onEntitySelect(entity);
    };

    container.addEventListener('mousemove', handlePointer);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mousemove', handlePointer);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('click', handleClick);
    };
  }, [entityByName, entityList, onEntitySelect, useVirtualization]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {mode === 'clean' ? 'Clean text view' : 'Original OCR view'}
          {document?.contentRefined && mode === 'clean' && (
            <span className="ml-2 inline-flex items-center gap-1 text-violet-300">
              <Sparkles className="w-3.5 h-3.5" /> AI recovery available
            </span>
          )}
        </div>
        {mode === 'clean' && baselineTokens && (
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showRecoveryHighlights}
              onChange={(event) => onToggleRecoveryHighlights(event.target.checked)}
            />
            Show recovery highlights
          </label>
        )}
      </div>

      <div ref={containerRef} className="surface-quiet p-4 text-slate-200">
        {useVirtualization ? (
          <div style={{ height: `${allLines.length * lineHeight}px`, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: `${virtualStart * lineHeight}px`,
                left: 0,
                right: 0,
              }}
            >
              {visibleLines.map((line, index) => (
                <div
                  key={`line-${virtualStart + index}`}
                  className="min-h-[24px] leading-6"
                  dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {processedSections.map((section, index) => (
              <details key={section.id} open={index === 0} className="group">
                {section.id !== 'full' && (
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200 py-1">
                    {section.title}
                  </summary>
                )}
                <div
                  className={`${section.id !== 'full' ? 'mt-2 pl-2 border-l border-slate-700/70' : ''}`}
                >
                  {section.lines.map((line, lineIndex) => (
                    <div
                      key={`${section.id}-line-${lineIndex}`}
                      className="min-h-[24px] leading-6"
                      dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                    />
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {hover && (
        <div
          className="fixed z-[11000] pointer-events-none rounded-md border border-slate-700 bg-slate-900/95 px-2.5 py-1.5 text-xs text-slate-200 shadow-lg"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="font-medium">{hover.entity.name || hover.entity.full_name}</div>
          <div className="text-slate-400">
            {hover.entity.entity_type || hover.entity.type || 'Entity'}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigationTextRenderer;
