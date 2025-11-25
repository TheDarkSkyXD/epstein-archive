import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our navigation context
interface NavigationContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: Record<string, any>;
  setFilters: (filters: Record<string, any>) => void;
  selectedEntity: string | null;
  setSelectedEntity: (entity: string | null) => void;
  selectedDocument: string | null;
  setSelectedDocument: (document: string | null) => void;
  clearNavigation: () => void;
}

// Create the context with a default value
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Create a provider component
export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  // Load state from localStorage on initial render
  useEffect(() => {
    const savedSearchTerm = localStorage.getItem('navigationSearchTerm');
    const savedFilters = localStorage.getItem('navigationFilters');
    const savedEntity = localStorage.getItem('navigationSelectedEntity');
    const savedDocument = localStorage.getItem('navigationSelectedDocument');
    
    if (savedSearchTerm) setSearchTerm(savedSearchTerm);
    if (savedFilters) setFilters(JSON.parse(savedFilters));
    if (savedEntity) setSelectedEntity(savedEntity);
    if (savedDocument) setSelectedDocument(savedDocument);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('navigationSearchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('navigationFilters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (selectedEntity) {
      localStorage.setItem('navigationSelectedEntity', selectedEntity);
    } else {
      localStorage.removeItem('navigationSelectedEntity');
    }
  }, [selectedEntity]);

  useEffect(() => {
    if (selectedDocument) {
      localStorage.setItem('navigationSelectedDocument', selectedDocument);
    } else {
      localStorage.removeItem('navigationSelectedDocument');
    }
  }, [selectedDocument]);

  const clearNavigation = () => {
    setSearchTerm('');
    setFilters({});
    setSelectedEntity(null);
    setSelectedDocument(null);
    localStorage.removeItem('navigationSearchTerm');
    localStorage.removeItem('navigationFilters');
    localStorage.removeItem('navigationSelectedEntity');
    localStorage.removeItem('navigationSelectedDocument');
  };

  return (
    <NavigationContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        filters,
        setFilters,
        selectedEntity,
        setSelectedEntity,
        selectedDocument,
        setSelectedDocument,
        clearNavigation
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

// Create a custom hook to use the navigation context
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

// Export the context for direct access if needed
export default NavigationContext;