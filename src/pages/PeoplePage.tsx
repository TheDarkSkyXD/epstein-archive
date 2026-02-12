import React, { useState, useEffect, useRef } from 'react';
import Icon from '../components/common/Icon';
import { StatsDisplay } from '../components/pages/StatsDisplay';
import StatsSkeleton from '../components/pages/StatsSkeleton';
import EntityTypeFilter from '../components/entities/EntityTypeFilter';
import SortFilter from '../components/layout/SortFilter';
import SubjectCardV2 from '../components/entities/SubjectCardV2';
import PersonCardSkeleton from '../components/entities/PersonCardSkeleton';
import { FixedSizeGrid as Grid } from 'react-window';
import { Person, SubjectCardDTO } from '../types';
import { apiClient } from '../services/apiClient';

interface PeoplePageProps {
  dataStats: any;
  selectedRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  onRiskLevelClick: (level: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  onResetFilters: () => void;
  isAdmin: boolean;
  onAddSubject: () => void;
  entityType: string;
  onEntityTypeChange: (type: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  searchTerm: string;
  onPersonClick: (person: Person, searchTerm?: string) => void;
}

export const PeoplePage: React.FC<PeoplePageProps> = ({
  dataStats,
  selectedRiskLevel,
  onRiskLevelClick,
  onResetFilters,
  isAdmin,
  onAddSubject,
  entityType,
  onEntityTypeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  searchTerm,
  onPersonClick,
}) => {
  // Local state for ULTRATHINK mode
  const [subjects, setSubjects] = useState<SubjectCardDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  // Grid state
  const COLUMN_WIDTH = 340; // Approximate card width + gap
  const ROW_HEIGHT = 380; // Card height + gap
  const gridRef = useRef<Grid>(null);

  // We use infinite scrolling logic, but effectively we just load a massive page or handle pages?
  // ULTRATHINK says: "Server-Side Truth". We should filter on server.
  // For virtualization, we need random access.
  // Best pattern: "Infinite Loader" feeding the Grid.
  // Unsimplification: Just fetch the first 1000 items (or sensible limit) for now, or true infinite.
  // 1 Million scale requires TRUE infinite.
  // Let's implement a simple paged fetch for now, but display in a grid.
  // Actually, let's stick to the props-based pagination control for compatibility with the layout,
  // BUT fetch DTOs instead of full Person objects.

  // Wait, the requirement is "Refactor PeoplePage with react-window Grid".
  // And "Remove Legacy Heavy Logic".

  // Let's start by fetching the CURRENT page of DTOs.
  // We can't use `filteredPeople` (Person[]) because it's heavy.
  // We will re-use `currentPage` state if possible, but we don't own it (passed from App).
  // `App.tsx` owns `currentPage`.
  // If we want to be independent, we should own current page.
  // But the pagination controls are at the bottom.
  // Let's implement a local page state for now to prove the DTO fetch,
  // and ignore the passed page unless we sync it.

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const filters = {
          search: searchTerm,
          role: undefined, // Add role filter UI later if needed
          entityType: entityType === 'all' ? undefined : entityType,
          sortBy,
          likelihood: selectedRiskLevel,
          sortOrder,
        };

        const res = await apiClient.getSubjects(filters, page, PAGE_SIZE);
        if (active) {
          let nextSubjects = res.subjects || [];
          let nextTotal = res.total || 0;

          if (nextSubjects.length === 0 && nextTotal > 0) {
            const ents = await apiClient.getEntities(
              {
                searchTerm: searchTerm || undefined,
                entityType: entityType === 'all' ? undefined : entityType,
                sortBy: sortBy as any,
                sortOrder,
              },
              page,
              PAGE_SIZE,
            );
            nextTotal = ents.total || nextTotal;
            nextSubjects = (ents.data || []).map((e: any) => {
              const mediaCount = Array.isArray(e.photos) ? e.photos.length : 0;
              return {
                id: String(e.id),
                name: e.name || e.fullName || 'Unknown',
                role: e.primaryRole || e.title || 'Unknown',
                short_bio: e.bio ? String(e.bio).slice(0, 150) : undefined,
                stats: {
                  mentions: e.mentions || 0,
                  documents: e.files || e.documentCount || 0,
                  distinct_sources: Array.isArray(e.evidence_types) ? e.evidence_types.length : 0,
                  verified_media: mediaCount,
                },
                forensics: {
                  risk_level: (e.likelihood_score || 'LOW').toString().toUpperCase(),
                  evidence_ladder: mediaCount > 0 ? 'L1' : (e.mentions || 0) > 50 ? 'L2' : 'L3',
                  signal_strength: {
                    exposure: Math.min(
                      100,
                      Math.round((Math.log10((e.mentions || 0) + 1) / 3) * 100),
                    ),
                    connectivity: 0,
                    corroboration: Math.min(
                      100,
                      mediaCount * 20 +
                        (Array.isArray(e.evidence_types) ? e.evidence_types.length * 15 : 0),
                    ),
                  },
                  driver_labels: [],
                },
                top_preview: undefined,
              } as SubjectCardDTO;
            });
          }

          setSubjects(nextSubjects);
          setTotal(nextTotal);
          if (gridRef.current) {
            gridRef.current.scrollTo({ scrollTop: 0 });
          }
        }
      } catch (_e) {
        try {
          const ents = await apiClient.getEntities(
            {
              searchTerm: searchTerm || undefined,
              entityType: entityType === 'all' ? undefined : entityType,
              sortBy: sortBy as any,
              sortOrder,
            },
            page,
            PAGE_SIZE,
          );
          const nextTotal = ents.total || 0;
          const data = ents.data || [];
          // Compute max connection count across this page for relative network strength
          const pageMaxConn = Math.max(
            1,
            ...data.map((e: any) => {
              const connStr = String(e.connections_summary || e.connections || '');
              if (/^\d+$/.test(connStr)) return parseInt(connStr, 10) || 0;
              return (connStr.match(/,/g) || []).length;
            }),
          );
          const nextSubjects = data.map((e: any) => {
            const mediaCount = Array.isArray(e.photos) ? e.photos.length : 0;
            const connStr = String(e.connections_summary || e.connections || '');
            let connCount = 0;
            if (/^\d+$/.test(connStr)) connCount = parseInt(connStr, 10) || 0;
            else connCount = (connStr.match(/,/g) || []).length;
            return {
              id: String(e.id),
              name: e.name || e.fullName || 'Unknown',
              role: e.primaryRole || e.title || 'Unknown',
              short_bio: e.bio ? String(e.bio).slice(0, 150) : undefined,
              stats: {
                mentions: e.mentions || 0,
                documents: e.files || e.documentCount || 0,
                distinct_sources: Array.isArray(e.evidence_types) ? e.evidence_types.length : 0,
                verified_media: mediaCount,
              },
              forensics: {
                risk_level: (e.likelihood_score || 'LOW').toString().toUpperCase(),
                evidence_ladder: mediaCount > 0 ? 'L1' : (e.mentions || 0) > 50 ? 'L2' : 'L3',
                signal_strength: {
                  exposure: Math.min(
                    100,
                    Math.round((Math.log10((e.mentions || 0) + 1) / 3) * 100),
                  ),
                  connectivity: Math.min(100, Math.round((connCount / pageMaxConn) * 100)),
                  corroboration: Math.min(
                    100,
                    mediaCount * 20 +
                      (Array.isArray(e.evidence_types) ? e.evidence_types.length * 15 : 0),
                  ),
                },
                driver_labels: [],
              },
              top_preview: undefined,
            } as SubjectCardDTO;
          });
          if (active) {
            setSubjects(nextSubjects);
            setTotal(nextTotal);
          }
        } catch {
          if (active) {
            setSubjects([]);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [page, searchTerm, entityType, sortBy, sortOrder, selectedRiskLevel]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, entityType, sortBy, sortOrder, selectedRiskLevel]);

  // Render Cell for Grid
  const Cell = ({ columnIndex, rowIndex, style, data }: any) => {
    const { items, columnCount } = data;
    const index = rowIndex * columnCount + columnIndex;
    const subject = items[index];

    if (!subject) return null;

    // Adjust style for gutter
    const gutterStyle = {
      ...style,
      left: Number(style.left) + 8,
      top: Number(style.top) + 8,
      width: Number(style.width) - 16,
      height: Number(style.height) - 16,
    };

    return (
      <SubjectCardV2
        subject={subject}
        style={gutterStyle}
        onClick={() => {
          // Map DTO to Person-like structure for the legacy callback
          const personLike: Person = {
            id: subject.id,
            name: subject.name,
            primaryRole: subject.role,
            role: subject.role,
            mentions: subject.stats.mentions,
            files: subject.stats.documents,
            // other fields missing, evidence modal might need fetch
            evidence_types: [], // TODO: DTO inject
            contexts: [],
            red_flag_rating: 0, // TODO from forensics
          } as any;
          onPersonClick(personLike, searchTerm);
        }}
      />
    );
  };

  const totalPagesLocal = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Stats Overview */}
      {loading && !dataStats.totalPeople ? (
        <StatsSkeleton />
      ) : (
        <StatsDisplay
          stats={dataStats}
          selectedRiskLevel={selectedRiskLevel}
          onRiskLevelClick={onRiskLevelClick}
          onResetFilters={onResetFilters}
        />
      )}

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3 flex-shrink-0">
        <div className="hidden md:flex items-center gap-2">
          <Icon name="Users" size="md" color="info" className="flex-shrink-0" />
          <p className="text-slate-400 text-sm">
            {total.toLocaleString()} subjects • Page {page}/{totalPagesLocal || 1}
          </p>
        </div>

        <div className="w-full md:w-auto grid grid-cols-[1fr_1fr_auto] gap-2 md:flex md:items-center font-sans">
          {isAdmin && (
            <button
              onClick={onAddSubject}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
            >
              <Icon name="Plus" size="sm" />
              <span className="hidden sm:inline">Add Subject</span>
            </button>
          )}

          <EntityTypeFilter
            value={entityType}
            onChange={onEntityTypeChange}
            className="w-full md:w-auto"
          />

          <SortFilter
            value={sortBy}
            onChange={(val) => onSortByChange(val as any)}
            options={[
              { value: 'red_flag', label: 'Red Flag', icon: <span>🚩</span> },
              { value: 'mentions', label: 'Mentions', icon: <span>📊</span> },
              { value: 'risk', label: 'Risk', icon: <span>⚠️</span> },
              { value: 'name', label: 'Name', icon: <span>👤</span> },
            ]}
            className="w-full md:w-auto"
          />

          <button
            onClick={onSortOrderToggle}
            className="h-10 w-10 flex items-center justify-center bg-slate-800 border border-slate-600 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 min-h-[600px] w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <PersonCardSkeleton key={i} />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="Users" size="xl" color="gray" className="mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No results found</h3>
            <p className="text-slate-400">Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <SubjectCardV2 key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls - Local */}
      {totalPagesLocal > 1 && (
        <div className="flex items-center justify-center space-x-4 mt-4 flex-shrink-0 pb-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors btn-secondary"
          >
            <Icon name="ChevronLeft" size="sm" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Page</span>
            <span className="text-white font-medium">{page}</span>
            <span className="text-slate-400">of</span>
            <span className="text-white font-medium">{totalPagesLocal}</span>
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPagesLocal, p + 1))}
            disabled={page === totalPagesLocal}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors btn-secondary"
          >
            <span>Next</span>
            <Icon name="ChevronRight" size="sm" />
          </button>
        </div>
      )}
    </div>
  );
};
