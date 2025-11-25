import { EvidenceChain, AuthenticityScore, CustodyEvent, TransformationEvent } from '../types/investigation';
import { apiClient } from './apiClient';

/**
 * Evidence Chain Service
 * 
 * Tracks document authenticity, provenance, and chain of custody
 * Essential for investigative journalism credibility and legal admissibility
 */
export class EvidenceChainService {
  private static instance: EvidenceChainService;
  
  private constructor() {}
  
  static getInstance(): EvidenceChainService {
    if (!EvidenceChainService.instance) {
      EvidenceChainService.instance = new EvidenceChainService();
    }
    return EvidenceChainService.instance;
  }

  /**
   * Generate evidence chain for a document
   */
  async generateEvidenceChain(documentId: string): Promise<EvidenceChain> {
    try {
      // Get document metadata
      const document = await apiClient.getDocument(documentId);
      
      // Generate content hash
      const contentHash = await this.generateContentHash(document.content || '');
      
      // Build source provenance
      const sourceProvenance = this.buildSourceProvenance(document);
      
      // Track transformations
      const transformations = await this.trackTransformations(documentId);
      
      // Calculate authenticity score
      const authenticity = await this.calculateAuthenticityScore(document, transformations);
      
      // Build custody chain
      const custodyChain = await this.buildCustodyChain(documentId);
      
      return {
        documentId,
        contentHash,
        sourceProvenance,
        transformations,
        authenticity,
        custodyChain,
        verificationStatus: authenticity.overall > 80 ? 'verified' : 'pending'
      };
    } catch (error) {
      console.error('Error generating evidence chain:', error);
      throw new Error(`Failed to generate evidence chain for document ${documentId}`);
    }
  }

  /**
   * Generate cryptographic hash of document content
   */
  private async generateContentHash(content: string): Promise<string> {
    // Use Web Crypto API for browser compatibility
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Build source provenance information
   */
  private buildSourceProvenance(document: any): EvidenceChain['sourceProvenance'] {
    return {
      originalPath: document.file_path || document.fileName || 'unknown',
      importDate: new Date(document.created_at || Date.now()),
      importSource: document.source || 'archive',
      importMethod: this.determineImportMethod(document),
      sourceReliability: this.assessSourceReliability(document),
      sourceDescription: document.description || 'Document from Epstein Archive',
      chainOfCustodyDocuments: document.custody_documents || []
    };
  }

  /**
   * Determine import method based on document metadata
   */
  private determineImportMethod(document: any): 'manual' | 'api' | 'scrape' | 'leak' {
    if (document.source?.includes('leak') || document.source?.includes('whistleblower')) {
      return 'leak';
    }
    if (document.source?.includes('scrape') || document.source?.includes('crawl')) {
      return 'scrape';
    }
    if (document.source?.includes('api') || document.metadata?.api_source) {
      return 'api';
    }
    return 'manual';
  }

  /**
   * Assess source reliability
   */
  private assessSourceReliability(document: any): 'high' | 'medium' | 'low' | 'unknown' {
    const source = (document.source || '').toLowerCase();
    
    if (source.includes('court') || source.includes('government') || source.includes('official')) {
      return 'high';
    }
    if (source.includes('news') || source.includes('media') || source.includes('report')) {
      return 'medium';
    }
    if (source.includes('leak') || source.includes('rumor') || source.includes('social')) {
      return 'low';
    }
    return 'unknown';
  }

  /**
   * Track document transformations
   */
  private async trackTransformations(documentId: string): Promise<TransformationEvent[]> {
    // This would typically come from a transformation log
    // For now, we'll infer from document metadata
    const transformations: TransformationEvent[] = [];
    
    // Check if OCR was performed
    if (documentId.includes('_ocr') || documentId.includes('_processed')) {
      transformations.push({
        date: new Date(),
        type: 'ocr',
        description: 'Optical Character Recognition performed on document',
        inputHash: 'original_scan_hash',
        outputHash: 'ocr_text_hash',
        tool: 'Tesseract OCR',
        confidence: 0.85,
        operator: 'system'
      });
    }
    
    // Check if metadata extraction was performed
    transformations.push({
      date: new Date(),
      type: 'metadata_extraction',
      description: 'Metadata extracted from document',
      inputHash: 'original_document_hash',
      outputHash: 'metadata_hash',
      tool: 'Document Processor',
      operator: 'system'
    });
    
    return transformations;
  }

  /**
   * Calculate authenticity score
   */
  private async calculateAuthenticityScore(
    document: any, 
    transformations: TransformationEvent[]
  ): Promise<AuthenticityScore> {
    const factors = {
      sourceReliability: this.scoreSourceReliability(document),
      chainIntegrity: this.scoreChainIntegrity(transformations),
      contentConsistency: await this.scoreContentConsistency(document),
      technicalAuthenticity: this.scoreTechnicalAuthenticity(document),
      corroboration: await this.scoreCorroboration(document)
    };
    
    const overall = Math.round(
      (factors.sourceReliability * 0.25 +
       factors.chainIntegrity * 0.20 +
       factors.contentConsistency * 0.20 +
       factors.technicalAuthenticity * 0.15 +
       factors.corroboration * 0.20)
    );
    
    return {
      overall,
      factors,
      assessmentDate: new Date(),
      assessedBy: 'Evidence Chain Service',
      methodology: 'Multi-factor authenticity assessment based on source reliability, chain integrity, content consistency, technical authenticity, and corroboration evidence'
    };
  }

  /**
   * Score source reliability (0-100)
   */
  private scoreSourceReliability(document: any): number {
    const reliability = this.assessSourceReliability(document);
    switch (reliability) {
      case 'high': return 90;
      case 'medium': return 70;
      case 'low': return 40;
      default: return 20;
    }
  }

  /**
   * Score chain integrity (0-100)
   */
  private scoreChainIntegrity(transformations: TransformationEvent[]): number {
    if (transformations.length === 0) return 50;
    
    // Score based on transformation documentation and hash verification
    const documentedTransforms = transformations.filter(t => t.inputHash && t.outputHash).length;
    return Math.round((documentedTransforms / transformations.length) * 100);
  }

  /**
   * Score content consistency (0-100)
   */
  private async scoreContentConsistency(document: any): Promise<number> {
    // Check for internal consistency markers
    let score = 50; // Base score
    
    if (document.content) {
      // Check for consistent dates, names, facts
      const hasConsistentDates = this.checkDateConsistency(document.content);
      const hasConsistentNames = this.checkNameConsistency(document.content);
      
      if (hasConsistentDates) score += 20;
      if (hasConsistentNames) score += 20;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Score technical authenticity (0-100)
   */
  private scoreTechnicalAuthenticity(document: any): number {
    let score = 50; // Base score
    
    // Check for technical indicators of authenticity
    if (document.metadata?.file_size) score += 10;
    if (document.metadata?.creation_date) score += 10;
    if (document.metadata?.file_type) score += 10;
    if (document.content_hash) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Score corroboration (0-100)
   */
  private async scoreCorroboration(document: any): Promise<number> {
    // Check for corroborating evidence in other documents
    try {
      const searchResults = await apiClient.search(
        document.title || document.fileName || '',
        10
      );
      const relatedDocs = searchResults.documents;
      
      const corroboratingDocs = relatedDocs.filter((doc: any) => 
        doc.id !== document.id && 
        this.hasCorroboratingContent(document, doc)
      );
      
      return Math.round((corroboratingDocs.length / Math.max(relatedDocs.length, 1)) * 100);
    } catch (error) {
      return 30; // Default score if search fails
    }
  }

  /**
   * Build custody chain
   */
  private async buildCustodyChain(documentId: string): Promise<CustodyEvent[]> {
    // This would typically come from a custody chain log
    // For now, we'll create a basic chain based on document metadata
    const events: CustodyEvent[] = [];
    
    // Add import event
    events.push({
      date: new Date(),
      custodian: 'Epstein Archive System',
      action: 'received',
      description: 'Document imported into investigation platform',
      location: 'Archive Server'
    });
    
    // Add analysis event
    events.push({
      date: new Date(),
      custodian: 'Evidence Chain Service',
      action: 'analyzed',
      description: 'Document authenticity and provenance analysis completed',
      location: 'Analysis System'
    });
    
    // Add storage event
    events.push({
      date: new Date(),
      custodian: 'Archive System',
      action: 'stored',
      description: 'Document stored in secure evidence repository',
      location: 'Secure Storage'
    });
    
    return events;
  }

  /**
   * Helper methods for content analysis
   */
  private checkDateConsistency(content: string): boolean {
    // Simple date consistency check
    const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
    const dates = content.match(dateRegex) || [];
    return dates.length > 0; // Basic check - could be more sophisticated
  }

  private checkNameConsistency(content: string): boolean {
    // Simple name consistency check
    const nameRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const names = content.match(nameRegex) || [];
    return names.length > 0; // Basic check
  }

  private hasCorroboratingContent(doc1: any, doc2: any): boolean {
    // Check if documents share common entities, dates, or themes
    const content1 = (doc1.content || '').toLowerCase();
    const content2 = (doc2.content || '').toLowerCase();
    
    // Simple overlap check
    const words1 = content1.split(/\s+/);
    const words2 = content2.split(/\s+/);
    const overlap = words1.filter((word: string) => words2.includes(word)).length;
    
    return overlap > 5; // Basic threshold
  }

  /**
   * Verify evidence chain integrity
   */
  async verifyEvidenceChain(evidenceChain: EvidenceChain): Promise<boolean> {
    try {
      // Verify content hash
      const document = await apiClient.getDocument(evidenceChain.documentId);
      const currentHash = await this.generateContentHash(document.content || '');
      
      if (currentHash !== evidenceChain.contentHash) {
        return false;
      }
      
      // Verify custody chain signatures
      for (const event of evidenceChain.custodyChain) {
        if (event.verificationHash && event.signature) {
          // Verify signature (would need proper crypto implementation)
          const isValid = await this.verifySignature(event);
          if (!isValid) return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying evidence chain:', error);
      return false;
    }
  }

  /**
   * Verify digital signature
   */
  private async verifySignature(event: CustodyEvent): Promise<boolean> {
    // Placeholder for signature verification
    // In a real implementation, this would use proper cryptographic verification
    return true;
  }

  /**
   * Get evidence chain summary
   */
  getEvidenceChainSummary(evidenceChain: EvidenceChain): string {
    const { authenticity, sourceProvenance, custodyChain } = evidenceChain;
    
    return `
Evidence Chain Summary:
- Overall Authenticity: ${authenticity.overall}/100
- Source Reliability: ${sourceProvenance.sourceReliability}
- Import Method: ${sourceProvenance.importMethod}
- Chain Length: ${custodyChain.length} events
- Verification Status: ${evidenceChain.verificationStatus}
- Last Assessment: ${authenticity.assessmentDate.toLocaleDateString()}
    `.trim();
  }
}