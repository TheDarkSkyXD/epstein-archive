import React from 'react';
import Icon from '../components/common/Icon';
import { StatsDisplay } from '../components/pages/StatsDisplay';
import StatsSkeleton from '../components/pages/StatsSkeleton';
import EntityTypeFilter from '../components/entities/EntityTypeFilter';
import SortFilter from '../components/layout/SortFilter';
import PersonCard from '../components/entities/PersonCard';
import PersonCardSkeleton from '../components/entities/PersonCardSkeleton';
import { VirtualList } from '../components/common/VirtualList';
import { Person } from '../types';

interface PeoplePageProps {
  loading: boolean;
  dataStats: any;
  selectedRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  onRiskLevelClick: (level: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  onResetFilters: () => void;
  totalPeople: number;
  currentPage: number;
  totalPages: number;
  isAdmin: boolean;
  onAddSubject: () => void;
  entityType: string;
  onEntityTypeChange: (type: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  searchTerm: string;
  filteredPeople: Person[];
  onPersonClick: (person: Person, searchTerm?: string) => void;
  onDocumentClick: (doc: any, searchTerm?: string) => void;
  onPageChange: (page: number) => void;
  navigate: (path: string) => void;
}

export const PeoplePage: React.FC<PeoplePageProps> = ({
  loading,
  dataStats,
  selectedRiskLevel,
  onRiskLevelClick,
  onResetFilters,
  totalPeople,
  currentPage,
  totalPages,
  isAdmin,
  onAddSubject,
  entityType,
  onEntityTypeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  searchTerm,
  filteredPeople,
  onPersonClick,
  onDocumentClick,
  onPageChange,
  navigate,
}) => {
  return (
    <div className="space-y-6">
      {/* Stats Overview - Using Real Data */}
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

      {/* Filters and Controls - Mobile-first layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        {/* Results info - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <Icon name="Users" size="md" color="info" className="flex-shrink-0" />
          <p className="text-slate-400 text-sm">
            {totalPeople.toLocaleString()} subjects
            {totalPages > 1 && ` • Page ${currentPage}/${totalPages}`}
          </p>
        </div>

        {/* Controls - Always visible, compact on mobile */}
        <div className="w-full md:w-auto grid grid-cols-[1fr_1fr_auto] gap-2 md:flex md:items-center font-sans">
          {/* Add Subject - Only for admin/moderator users */}
          {isAdmin && (
            <button
              onClick={onAddSubject}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
            >
              <Icon name="Plus" size="sm" />
              <span className="hidden sm:inline">Add Subject</span>
            </button>
          )}

          {/* Entity Type Filter */}
          <EntityTypeFilter
            value={entityType}
            onChange={onEntityTypeChange}
            className="w-full md:w-auto"
          />

          {/* Sort Dropdown - No label on mobile */}
          <SortFilter
            value={sortBy}
            onChange={(val) => onSortByChange(val as any)}
            options={[
              {
                value: 'red_flag',
                label: 'Red Flag',
                icon: (
                  <div className="w-4 h-4 flex items-center justify-center text-base leading-none">
                    🚩
                  </div>
                ),
              },
              {
                value: 'mentions',
                label: 'Mentions',
                icon: (
                  <div className="w-4 h-4 flex items-center justify-center text-base leading-none">
                    📊
                  </div>
                ),
              },
              {
                value: 'risk',
                label: 'Risk',
                icon: (
                  <div className="w-4 h-4 flex items-center justify-center text-base leading-none">
                    ⚠️
                  </div>
                ),
              },
              {
                value: 'name',
                label: 'Name',
                icon: (
                  <div className="w-4 h-4 flex items-center justify-center text-base leading-none">
                    👤
                  </div>
                ),
              },
            ]}
            className="w-full md:w-auto"
          />

          {/* Sort Order Toggle */}
          <button
            onClick={onSortOrderToggle}
            className="h-10 w-10 flex items-center justify-center bg-slate-800 border border-slate-600 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Featured Content Banner - Only on Page 1 Default View */}
      {currentPage === 1 && !searchTerm && !entityType && (
        <div className="mb-8 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-900/40 to-slate-900/40 p-6 shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  NEW INVESTIGATION
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                  <span className="animate-pulse">●</span> HIGH PRIORITY
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight group-hover:text-blue-200 transition-colors">
                The Sascha Barros Testimony
              </h2>
              <p className="text-slate-300 max-w-2xl leading-relaxed">
                Exclusive 6-part interview series revealing critical new details about the network's
                operation. Includes full audio recordings and searchable precision transcripts.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
              <button
                onClick={() => navigate('/media/audio?albumId=25')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 group/btn"
              >
                <svg
                  className="w-5 h-5 fill-current group-hover/btn:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                Listen to Interviews
              </button>
              <button
                onClick={() => navigate('/media/articles?q=Sascha%20Barros')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium transition-all hover:bg-slate-750"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Read Transcripts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* People Grid - Use virtualization for large datasets */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Show 12 skeletons while loading to match 3-column grid */}
          {[...Array(12)].map((_, index) => (
            <PersonCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      ) : filteredPeople.length > 100 ? (
        // Use virtual list for large datasets
        <div className="h-[600px]">
          <VirtualList
            items={filteredPeople}
            itemHeight={300}
            containerHeight={600}
            renderItem={(person, index) => (
              <div className="p-2">
                <PersonCard
                  key={`${person.name}-${index}`}
                  person={person}
                  onClick={() => onPersonClick(person, searchTerm)}
                  searchTerm={searchTerm}
                  onDocumentClick={onDocumentClick}
                />
              </div>
            )}
            onItemClick={(person) => onPersonClick(person, searchTerm)}
          />
        </div>
      ) : (
        // Use grid layout for smaller datasets
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPeople.map((person, index) => (
            <PersonCard
              key={`${person.name}-${index}`}
              person={person}
              onClick={() => onPersonClick(person, searchTerm)}
              searchTerm={searchTerm}
              onDocumentClick={onDocumentClick}
            />
          ))}
        </div>
      )}

      {!loading && filteredPeople.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Users" size="xl" color="gray" className="mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No results found</h3>
          <p className="text-slate-400">Try adjusting your search terms</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 mt-8">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors btn-secondary"
          >
            <Icon name="ChevronLeft" size="sm" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Page</span>
            <span className="text-white font-medium">{currentPage}</span>
            <span className="text-slate-400">of</span>
            <span className="text-white font-medium">{totalPages}</span>
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
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
