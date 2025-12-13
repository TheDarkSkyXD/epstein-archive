import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

interface SortOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SortFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
  className?: string;
}

const SortFilter: React.FC<SortFilterProps> = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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
           {selectedOption.icon}
           <span>{selectedOption.label}</span>
        </div>
        <Icon name="ChevronDown" size="sm" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-lg min-w-[140px] right-0 md:left-0 md:right-auto">
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
                {option.icon}
                <span>{option.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SortFilter;
