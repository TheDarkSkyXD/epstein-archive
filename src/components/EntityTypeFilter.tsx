import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { getEntityTypeIcon } from '../utils/entityTypeIcons';

interface EntityTypeOption {
  value: string;
  label: string;
}

interface EntityTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const EntityTypeFilter: React.FC<EntityTypeFilterProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const options: EntityTypeOption[] = [
    { value: 'all', label: 'All Types' },
    { value: 'Person', label: 'Person' },
    { value: 'Organization', label: 'Organization' },
    { value: 'Location', label: 'Location' },
    { value: 'Document', label: 'Document' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-slate-800 border border-slate-600 rounded-lg px-3 h-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 flex items-center gap-2 justify-between w-full min-w-[120px]`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {getEntityTypeIcon(selectedOption.value, 'sm')}
          <span>{selectedOption.label}</span>
        </div>
        <Icon name="ChevronDown" size="sm" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
          <ul 
            role="listbox" 
            className="py-1"
          >
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-slate-700 ${
                  option.value === value ? 'bg-slate-700 text-white' : 'text-slate-300'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {getEntityTypeIcon(option.value, 'sm')}
                <span>{option.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EntityTypeFilter;