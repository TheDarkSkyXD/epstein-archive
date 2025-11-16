import { Document, DocumentMetadata, Entity, Passage, DocumentCollection, BrowseFilters } from '../types/documents';

export class DocumentProcessor {
  private documents: Map<string, Document> = new Map();
  private entities: Map<string, Entity> = new Map();
  private passages: Map<string, Passage[]> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private entityIndex: Map<string, Set<string>> = new Map();
  private dateIndex: Map<string, Set<string>> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  
  // Performance optimizations

  private searchCache: Map<string, Document[]> = new Map();
  private lastSearchTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Keywords for spice rating calculation
  private readonly SPICY_KEYWORDS = {
    'criminal': 5, 'indictment': 5, 'charges': 5, 'arrest': 5, 'conviction': 5,
    'sex': 4, 'minor': 4, 'underage': 4, 'rape': 4, 'assault': 4,
    'flight': 3, 'private jet': 3, 'island': 3, 'lolita': 3, 'massage': 3,
    'trump': 2, 'clinton': 2, 'president': 2, 'prince': 2, 'senator': 2,
    'epstein': 1, 'maxwell': 1, 'ghislaine': 1
  };

  // Entity extraction patterns
  private readonly ENTITY_PATTERNS = {
    person: /\b([A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?)\b/g,
    email: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    date: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
    amount: /\$[0-9,]+(?:\.[0-9]{2})?/g,
    location: /\b(?:New York|Los Angeles|Chicago|Miami|Palm Beach|Little St James|Epstein Island)\b/g
  };

  async processDocument(filePath: string, content: string): Promise<Document> {
    const id = this.generateDocumentId(filePath);
    const metadata = this.extractMetadata(filePath, content);
    const entities = this.extractEntities(content, filePath);
    const passages = this.extractPassages(content, filePath);
    const spiceScore = this.calculateSpiceScore(content);
    const spiceRating = this.calculateSpiceRating(spiceScore);

    const document: Document = {
      id,
      filename: filePath.split('/').pop() || filePath,
      title: this.extractTitle(content, filePath),
      content,
      fileType: this.detectFileType(filePath),
      fileSize: content.length,
      metadata,
      entities,
      passages,
      spiceScore,
      spiceRating: spiceRating.rating,
      spicePeppers: spiceRating.peppers,
      spiceDescription: spiceRating.description
    };

    this.documents.set(id, document);
    this.buildSearchIndex(document);
    this.buildInvertedIndex(document);
    this.buildEntityIndex(document);
    this.buildDateIndex(document);
    this.buildCategoryIndex(document);
    this.updateEntityIndex(entities);
    this.passages.set(id, passages);

    return document;
  }

  async processDocumentBatch(fileContents: Array<{path: string, content: string}>): Promise<Document[]> {
    const documents: Document[] = [];
    
    for (const file of fileContents) {
      try {
        const document = await this.processDocument(file.path, file.content);
        documents.push(document);
      } catch (error) {
        console.error(`Error processing ${file.path}:`, error);
      }
    }

    return documents;
  }

  private generateDocumentId(filePath: string): string {
    return btoa(filePath).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  }

  private extractTitle(content: string, filePath: string): string {
    // Try to extract title from content first
    const titleMatch = content.match(/^(Subject:|Title:|Re:)[\s]*(.+)$/im);
    if (titleMatch) {
      return titleMatch[2].trim();
    }

    // Fallback to filename
    const filename = filePath.split('/').pop() || filePath;
    return filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
  }

  private detectFileType(filePath: string): 'email' | 'pdf' | 'txt' | 'doc' | 'image' | 'other' {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    if (filePath.includes('email') || ext === 'eml' || ext === 'msg') return 'email';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'txt' || ext === 'text') return 'txt';
    if (ext === 'doc' || ext === 'docx') return 'doc';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext || '')) return 'image';
    
    return 'other';
  }

  private extractMetadata(filePath: string, content: string): DocumentMetadata {
    const metadata: DocumentMetadata = {
      tags: [],
      categories: [],
      confidentiality: 'public',
      source: this.detectSource(filePath)
    };

    // Extract email-specific metadata
    if (this.detectFileType(filePath) === 'email') {
      const subjectMatch = content.match(/^Subject:[\s]*(.+)$/im);
      const fromMatch = content.match(/^From:[\s]*(.+)$/im);
      const toMatch = content.match(/^To:[\s]*(.+)$/im);
      const dateMatch = content.match(/^Date:[\s]*(.+)$/im);

      if (subjectMatch) metadata.subject = subjectMatch[1].trim();
      if (fromMatch) metadata.author = fromMatch[1].trim();
      if (toMatch) metadata.recipient = toMatch[1].trim();
      if (dateMatch) metadata.testimonyDate = dateMatch[1].trim();
    }

    // Extract flight log metadata
    if (content.includes('flight') || content.includes('N-number') || content.includes('tail number')) {
      const flightMatch = content.match(/Flight\s+(\w+)/i);
      const dateMatch = content.match(/Date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
      const fromMatch = content.match(/From[:\s]+([A-Za-z\s]+)/i);
      const toMatch = content.match(/To[:\s]+([A-Za-z\s]+)/i);

      if (flightMatch) metadata.flightNumber = flightMatch[1];
      if (dateMatch) metadata.flightDate = dateMatch[1];
      if (fromMatch) metadata.flightFrom = fromMatch[1].trim();
      if (toMatch) metadata.flightTo = toMatch[1].trim();
    }

    // Extract legal metadata
    if (content.includes('deposition') || content.includes('testimony') || content.includes('court')) {
      metadata.categories.push('legal');
      const caseMatch = content.match(/Case\s+(?:No\.?\s*)?(\w+)/i);
      const depoMatch = content.match(/Deposition\s+Date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

      if (caseMatch) metadata.legalCase = caseMatch[1];
      if (depoMatch) metadata.depositionDate = depoMatch[1];
    }

    // Determine confidentiality
    if (content.includes('CONFIDENTIAL') || content.includes('SEALED')) {
      metadata.confidentiality = 'confidential';
    } else if (content.includes('CLASSIFIED')) {
      metadata.confidentiality = 'classified';
    }

    return metadata;
  }

  private detectSource(filePath: string): string {
    if (filePath.includes('house_oversight')) return 'House Oversight Committee';
    if (filePath.includes('fbi')) return 'FBI Files';
    if (filePath.includes('palm_beach')) return 'Palm Beach Police';
    if (filePath.includes('flight_log')) return 'Flight Logs';
    if (filePath.includes('email')) return 'Email Archive';
    if (filePath.includes('legal')) return 'Legal Documents';
    return 'Unknown Source';
  }

  private extractEntities(content: string, filePath: string): Entity[] {
    const entities: Map<string, Entity> = new Map();

    // Extract people
    const peopleMatches = content.match(this.ENTITY_PATTERNS.person) || [];
    peopleMatches.forEach(name => {
      if (this.isValidPersonName(name)) {
        this.addEntity(entities, name, 'person', content, filePath);
      }
    });

    // Extract emails
    const emailMatches = content.match(this.ENTITY_PATTERNS.email) || [];
    emailMatches.forEach(email => {
      this.addEntity(entities, email, 'email', content, filePath);
    });

    // Extract phone numbers
    const phoneMatches = content.match(this.ENTITY_PATTERNS.phone) || [];
    phoneMatches.forEach(phone => {
      this.addEntity(entities, phone, 'phone', content, filePath);
    });

    // Extract dates
    const dateMatches = content.match(this.ENTITY_PATTERNS.date) || [];
    dateMatches.forEach(date => {
      this.addEntity(entities, date, 'date', content, filePath);
    });

    // Extract amounts
    const amountMatches = content.match(this.ENTITY_PATTERNS.amount) || [];
    amountMatches.forEach(amount => {
      this.addEntity(entities, amount, 'amount', content, filePath);
    });

    // Extract locations
    const locationMatches = content.match(this.ENTITY_PATTERNS.location) || [];
    locationMatches.forEach(location => {
      this.addEntity(entities, location, 'location', content, filePath);
    });

    return Array.from(entities.values());
  }

  private addEntity(entities: Map<string, Entity>, name: string, type: Entity['type'], content: string, filePath: string) {
    if (!entities.has(name)) {
      entities.set(name, {
        name,
        type,
        mentions: 0,
        contexts: [],
        significance: 'medium',
        relatedEntities: []
      });
    }

    const entity = entities.get(name)!;
    entity.mentions++;

    // Find context around the entity mention
    const regex = new RegExp(`\\b${this.escapeRegExp(name)}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const start = Math.max(0, match.index - 100);
      const end = Math.min(content.length, match.index + name.length + 100);
      const context = content.substring(start, end);

      entity.contexts.push({
        passage: match[0],
        context: context,
        position: match.index,
        file: filePath,
        significance: this.calculateEntitySignificance(name, context)
      });
    }
  }

  private isValidPersonName(name: string): boolean {
    // Filter out common false positives
    const invalidNames = ['The', 'And', 'But', 'For', 'With', 'From', 'That', 'This', 'Page', 'File'];
    return !invalidNames.includes(name) && name.length > 3;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private calculateEntitySignificance(_name: string, context: string): 'high' | 'medium' | 'low' {
    const lowerContext = context.toLowerCase();
    
    if (lowerContext.includes('epstein') || lowerContext.includes('maxwell')) {
      return 'high';
    }
    
    if (lowerContext.includes('flight') || lowerContext.includes('island') || lowerContext.includes('massage')) {
      return 'medium';
    }
    
    return 'low';
  }

  private extractPassages(content: string, filePath: string): Passage[] {
    const passages: Passage[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length > 20) {
        const entities = this.extractEntitiesFromPassage(trimmedSentence);
        const keywords = this.extractKeywords(trimmedSentence);
        const spiceLevel = this.calculateSpiceScore(trimmedSentence);

        passages.push({
          id: `${filePath}_passage_${index}`,
          content: trimmedSentence,
          context: this.getPassageContext(content, index, sentences),
          keywords,
          entities: entities.map(e => e.name),
          spiceLevel,
          significance: this.calculatePassageSignificance(spiceLevel, entities.length),
          file: filePath,
          position: content.indexOf(trimmedSentence)
        });
      }
    });

    return passages;
  }

  private extractEntitiesFromPassage(passage: string): Entity[] {
    const entities: Entity[] = [];
    
    // Simple entity extraction for passages
    const peopleMatches = passage.match(this.ENTITY_PATTERNS.person) || [];
    peopleMatches.forEach(name => {
      if (this.isValidPersonName(name)) {
        entities.push({
          name,
          type: 'person',
          mentions: 1,
          contexts: [],
          significance: 'medium',
          relatedEntities: []
        });
      }
    });

    return entities;
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 3 && 
      !this.isStopWord(word) &&
      (this.SPICY_KEYWORDS[word as keyof typeof this.SPICY_KEYWORDS] || 0) > 0
    );
    
    return [...new Set(keywords)];
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    return stopWords.includes(word);
  }

  private getPassageContext(_content: string, index: number, sentences: string[]): string {
    const start = Math.max(0, index - 2);
    const end = Math.min(sentences.length, index + 3);
    return sentences.slice(start, end).join('. ').trim();
  }

  private calculatePassageSignificance(spiceLevel: number, entityCount: number): 'high' | 'medium' | 'low' {
    if (spiceLevel >= 4 || entityCount >= 3) return 'high';
    if (spiceLevel >= 2 || entityCount >= 1) return 'medium';
    return 'low';
  }

  private calculateSpiceScore(content: string): number {
    const lowerContent = content.toLowerCase();
    let score = 0;
    let keywordCount = 0;

    Object.entries(this.SPICY_KEYWORDS).forEach(([keyword, weight]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        score += matches.length * weight;
        keywordCount += matches.length;
      }
    });

    // Bonus for multiple spicy keywords
    if (keywordCount >= 5) score += 10;
    if (keywordCount >= 10) score += 20;

    return Math.min(score, 100); // Cap at 100
  }

  private calculateSpiceRating(score: number): { rating: number; peppers: string; description: string } {
    if (score >= 50) {
      return { rating: 5, peppers: '🌶️🌶️🌶️🌶️🌶️', description: 'Nuclear spicy - Major criminal evidence' };
    } else if (score >= 35) {
      return { rating: 4, peppers: '🌶️🌶️🌶️🌶️', description: 'Very spicy - Significant incriminating content' };
    } else if (score >= 20) {
      return { rating: 3, peppers: '🌶️🌶️🌶️', description: 'Moderately spicy - Notable controversial mentions' };
    } else if (score >= 10) {
      return { rating: 2, peppers: '🌶️🌶️', description: 'Mildly spicy - Some interesting connections' };
    } else {
      return { rating: 1, peppers: '🌶️', description: 'Barely spicy - Minor mentions' };
    }
  }

  private buildSearchIndex(document: Document) {
    const searchTerms = this.extractSearchTerms(document);
    
    searchTerms.forEach(term => {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, new Set());
      }
      this.searchIndex.get(term)!.add(document.id);
    });
  }

  private extractSearchTerms(document: Document): string[] {
    const terms: string[] = [];
    
    // Add title terms
    terms.push(...document.title.toLowerCase().split(/\s+/));
    
    // Add content terms (limit to avoid memory issues)
    const contentWords = document.content.toLowerCase().split(/\s+/);
    const uniqueWords = [...new Set(contentWords)].filter(word => word.length > 2);
    terms.push(...uniqueWords.slice(0, 1000)); // Limit to first 1000 unique words
    
    // Add entity names
    document.entities.forEach(entity => {
      terms.push(entity.name.toLowerCase());
    });
    
    // Add keywords from passages
    document.passages.forEach(passage => {
      terms.push(...passage.keywords);
    });
    
    return [...new Set(terms)].filter(term => term.length > 2);
  }

  private updateEntityIndex(entities: Entity[]) {
    entities.forEach(entity => {
      if (!this.entities.has(entity.name)) {
        this.entities.set(entity.name, {
          name: entity.name,
          type: entity.type,
          mentions: 0,
          contexts: [],
          significance: entity.significance,
          relatedEntities: []
        });
      }

      const existingEntity = this.entities.get(entity.name)!;
      existingEntity.mentions += entity.mentions;
      existingEntity.contexts.push(...entity.contexts);
      
      // Update significance if higher
      if (entity.significance === 'high' || 
          (entity.significance === 'medium' && existingEntity.significance === 'low')) {
        existingEntity.significance = entity.significance;
      }
    });
  }

  private buildInvertedIndex(document: Document) {
    const words = document.content.toLowerCase().split(/\s+/);
    const uniqueWords = [...new Set(words)].filter(word => word.length > 2);
    
    uniqueWords.forEach(word => {
      if (!this.invertedIndex.has(word)) {
        this.invertedIndex.set(word, new Set());
      }
      this.invertedIndex.get(word)!.add(document.id);
    });
  }

  private buildEntityIndex(document: Document) {
    document.entities.forEach(entity => {
      const entityKey = `${entity.type}:${entity.name.toLowerCase()}`;
      if (!this.entityIndex.has(entityKey)) {
        this.entityIndex.set(entityKey, new Set());
      }
      this.entityIndex.get(entityKey)!.add(document.id);
    });
  }

  private buildDateIndex(document: Document) {
    const datePattern = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g;
    const dates = document.content.match(datePattern) || [];
    
    dates.forEach(date => {
      const dateKey = new Date(date).toISOString().split('T')[0];
      if (!this.dateIndex.has(dateKey)) {
        this.dateIndex.set(dateKey, new Set());
      }
      this.dateIndex.get(dateKey)!.add(document.id);
    });
  }

  private buildCategoryIndex(document: Document) {
    document.metadata.categories.forEach(category => {
      if (!this.categoryIndex.has(category)) {
        this.categoryIndex.set(category, new Set());
      }
      this.categoryIndex.get(category)!.add(document.id);
    });
  }

  // Performance optimization methods
  private getCacheKey(type: string, params: any): string {
    return `${type}:${JSON.stringify(params)}`;
  }

  private setCache(key: string, value: Document[]): void {
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, value);
  }

  private getCache(key: string): Document[] | null {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - this.lastSearchTime < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }



  // Public methods for searching and browsing
  searchDocuments(query: string, filters?: BrowseFilters): Document[] {
    // Check cache first
    const cacheKey = this.getCacheKey('search', { query, filters });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const matchingDocIds = new Set<string>();

    // Search in inverted index first (full-text search)
    searchTerms.forEach(term => {
      if (this.invertedIndex.has(term)) {
        this.invertedIndex.get(term)!.forEach(docId => {
          matchingDocIds.add(docId);
        });
      }
    });

    // Search in entity index for named entities
    searchTerms.forEach(term => {
      ['person', 'email', 'location'].forEach(entityType => {
        const entityKey = `${entityType}:${term}`;
        if (this.entityIndex.has(entityKey)) {
          this.entityIndex.get(entityKey)!.forEach(docId => {
            matchingDocIds.add(docId);
          });
        }
      });
    });

    // Search in titles and entities directly
    if (matchingDocIds.size === 0) {
      // Fallback to title and entity search if no full-text matches
      Array.from(this.documents.values()).forEach(doc => {
        const titleMatch = searchTerms.some(term => 
          doc.title.toLowerCase().includes(term)
        );
        const entityMatch = doc.entities.some(entity => 
          searchTerms.some(term => entity.name.toLowerCase().includes(term))
        );
        
        if (titleMatch || entityMatch) {
          matchingDocIds.add(doc.id);
        }
      });
    }

    let results = Array.from(matchingDocIds).map(id => this.documents.get(id)!).filter(Boolean);

    // Apply filters
    if (filters) {
      results = this.applyFilters(results, filters);
    }

    // Sort by relevance (number of matching terms)
    results.sort((a, b) => {
      const aMatches = this.calculateRelevanceScore(a, searchTerms);
      const bMatches = this.calculateRelevanceScore(b, searchTerms);
      return bMatches - aMatches;
    });

    // Cache results
    this.setCache(cacheKey, results);
    this.lastSearchTime = Date.now();

    return results;
  }

  private calculateRelevanceScore(document: Document, searchTerms: string[]): number {
    let score = 0;
    
    // Title matches (higher weight)
    searchTerms.forEach(term => {
      if (document.title.toLowerCase().includes(term)) {
        score += 5;
      }
    });
    
    // Entity matches (medium weight)
    document.entities.forEach(entity => {
      searchTerms.forEach(term => {
        if (entity.name.toLowerCase().includes(term)) {
          score += 3;
        }
      });
    });
    
    // Content matches (lower weight)
    searchTerms.forEach(term => {
      const contentLower = document.content.toLowerCase();
      const matches = contentLower.match(new RegExp(`\\b${term}\\b`, 'g'));
      if (matches) {
        score += matches.length;
      }
    });
    
    // Spice score bonus
    score += document.spiceRating * 0.5;
    
    return score;
  }

  browseDocuments(filters: BrowseFilters, sortBy: string = 'relevance', sortOrder: 'asc' | 'desc' = 'desc'): Document[] {
    // Check cache first
    const cacheKey = this.getCacheKey('browse', { filters, sortBy, sortOrder });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    let documents = Array.from(this.documents.values());
    
    // Apply filters
    documents = this.applyFilters(documents, filters);
    
    // Sort results
    documents = this.sortDocuments(documents, sortBy, sortOrder);
    
    // Cache results
    this.setCache(cacheKey, documents);
    
    return documents;
  }

  private applyFilters(documents: Document[], filters: BrowseFilters): Document[] {
    return documents.filter(doc => {
      // File type filter
      if (filters.fileType && filters.fileType.length > 0) {
        if (!filters.fileType.includes(doc.fileType)) return false;
      }

      // Date range filter
      if (filters.dateRange) {
        if (filters.dateRange.start && doc.dateCreated && doc.dateCreated < filters.dateRange.start) return false;
        if (filters.dateRange.end && doc.dateCreated && doc.dateCreated > filters.dateRange.end) return false;
      }

      // Entities filter
      if (filters.entities && filters.entities.length > 0) {
        const docEntityNames = doc.entities.map(e => e.name);
        const hasMatchingEntity = filters.entities.some(entity => 
          docEntityNames.includes(entity)
        );
        if (!hasMatchingEntity) return false;
      }

      // Categories filter
      if (filters.categories && filters.categories.length > 0) {
        const hasMatchingCategory = filters.categories.some(category => 
          doc.metadata.categories.includes(category)
        );
        if (!hasMatchingCategory) return false;
      }

      // Spice level filter
      if (filters.spiceLevel) {
        if (doc.spiceRating < filters.spiceLevel.min || doc.spiceRating > filters.spiceLevel.max) {
          return false;
        }
      }

      // Confidentiality filter
      if (filters.confidentiality && filters.confidentiality.length > 0) {
        if (!filters.confidentiality.includes(doc.metadata.confidentiality)) return false;
      }

      // Source filter
      if (filters.source && filters.source.length > 0) {
        if (!filters.source.includes(doc.metadata.source)) return false;
      }

      return true;
    });
  }

  private sortDocuments(documents: Document[], sortBy: string, sortOrder: 'asc' | 'desc'): Document[] {
    return documents.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          const dateA = a.dateCreated || '';
          const dateB = b.dateCreated || '';
          comparison = dateA.localeCompare(dateB);
          break;
        case 'spice':
          comparison = a.spiceScore - b.spiceScore;
          break;
        case 'fileType':
          comparison = a.fileType.localeCompare(b.fileType);
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        default: // relevance - sort by entity count and mentions
          comparison = b.entities.length - a.entities.length;
          if (comparison === 0) {
            comparison = b.spiceScore - a.spiceScore;
          }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  getDocumentById(id: string): Document | undefined {
    return this.documents.get(id);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values()).sort((a, b) => b.mentions - a.mentions);
  }

  getDocumentCollection(): DocumentCollection {
    const documents = Array.from(this.documents.values());
    const fileTypes = new Map<string, number>();
    const categories = new Map<string, number>();
    
    documents.forEach(doc => {
      fileTypes.set(doc.fileType, (fileTypes.get(doc.fileType) || 0) + 1);
      doc.metadata.categories.forEach(cat => {
        categories.set(cat, (categories.get(cat) || 0) + 1);
      });
    });

    const dates = documents
      .map(doc => doc.dateCreated)
      .filter(date => date !== undefined)
      .sort();

    return {
      documents,
      entities: this.entities,
      totalFiles: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0),
      dateRange: {
        earliest: dates[0],
        latest: dates[dates.length - 1]
      },
      fileTypes,
      categories
    };
  }

  findRelatedDocuments(documentId: string, limit: number = 10): Document[] {
    const document = this.documents.get(documentId);
    if (!document) return [];

    const relatedDocs = new Map<string, number>();

    // Find documents with shared entities
    document.entities.forEach(entity => {
      const entityKey = `${entity.type}:${entity.name.toLowerCase()}`;
      if (this.entityIndex.has(entityKey)) {
        this.entityIndex.get(entityKey)!.forEach(docId => {
          if (docId !== documentId) {
            relatedDocs.set(docId, (relatedDocs.get(docId) || 0) + 1);
          }
        });
      }
    });

    // Find documents with shared categories
    document.metadata.categories.forEach(category => {
      if (this.categoryIndex.has(category)) {
        this.categoryIndex.get(category)!.forEach(docId => {
          if (docId !== documentId) {
            relatedDocs.set(docId, (relatedDocs.get(docId) || 0) + 0.5);
          }
        });
      }
    });

    // Sort by relevance score and return top results
    return Array.from(relatedDocs.entries())
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, limit)
      .map(([docId]) => this.documents.get(docId)!)
      .filter(Boolean);
  }

  findDocumentsByEntity(entityName: string, entityType?: string): Document[] {
    const results: Document[] = [];
    const searchKey = entityType ? `${entityType}:${entityName.toLowerCase()}` : entityName.toLowerCase();

    if (entityType && this.entityIndex.has(searchKey)) {
      this.entityIndex.get(searchKey)!.forEach(docId => {
        results.push(this.documents.get(docId)!);
      });
    } else {
      // Search across all entity types
      Array.from(this.entityIndex.entries()).forEach(([key, docIds]) => {
        if (key.includes(searchKey)) {
          docIds.forEach(docId => {
            results.push(this.documents.get(docId)!);
          });
        }
      });
    }

    return results;
  }

  findDocumentsByDate(date: string): Document[] {
    const dateKey = new Date(date).toISOString().split('T')[0];
    const results: Document[] = [];

    if (this.dateIndex.has(dateKey)) {
      this.dateIndex.get(dateKey)!.forEach(docId => {
        results.push(this.documents.get(docId)!);
      });
    }

    return results;
  }

  getEntityNetwork(entityName: string): { entity: Entity; connections: Array<{ entity: Entity; strength: number; sharedDocuments: string[] }> } {
    const entity = this.entities.get(entityName);
    if (!entity) return { entity: null as any, connections: [] };

    const connections = new Map<string, { entity: Entity; strength: number; sharedDocuments: string[] }>();

    // Find all documents containing this entity
    const entityDocs = this.findDocumentsByEntity(entityName, entity.type);

    entityDocs.forEach(doc => {
      doc.entities.forEach(otherEntity => {
        if (otherEntity.name !== entityName) {
          const key = otherEntity.name;
          if (!connections.has(key)) {
            connections.set(key, {
              entity: otherEntity,
              strength: 0,
              sharedDocuments: []
            });
          }
          
          const connection = connections.get(key)!;
          connection.strength += 1;
          connection.sharedDocuments.push(doc.id);
        }
      });
    });

    return {
      entity,
      connections: Array.from(connections.values())
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 20)
    };
  }

  getStatistics() {
    const collection = this.getDocumentCollection();
    const totalEntities = Array.from(this.entities.values()).length;
    const avgSpiceScore = collection.documents.reduce((sum, doc) => sum + doc.spiceScore, 0) / collection.totalFiles;

    return {
      totalDocuments: collection.totalFiles,
      totalEntities,
      totalSize: collection.totalSize,
      averageSpiceScore: Math.round(avgSpiceScore * 100) / 100,
      fileTypes: Array.from(collection.fileTypes.entries()),
      topEntities: this.getAllEntities().slice(0, 10),
      dateRange: collection.dateRange
    };
  }
}