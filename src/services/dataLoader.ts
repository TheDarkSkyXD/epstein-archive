import { Person } from '../types';

export interface RealPerson extends Omit<Person, 'fileReferences'> {
  fullName: string;
  primaryRole: string;
  secondaryRoles: string[];
  keyEvidence: string;
  fileReferences: string;
  connectionsToEpstein: string;
}

export class DataLoaderService {
  private static instance: DataLoaderService;
  private peopleData: RealPerson[] | null = null;
  private evidenceData: any | null = null;

  static getInstance(): DataLoaderService {
    if (!DataLoaderService.instance) {
      DataLoaderService.instance = new DataLoaderService();
    }
    return DataLoaderService.instance;
  }

  async loadPeopleData(): Promise<RealPerson[]> {
    if (this.peopleData) {
      return this.peopleData;
    }

    try {
      // Load the real people data from the processed JSON
      const response = await fetch('/data/people.json');
      if (!response.ok) {
        throw new Error('Failed to load people data');
      }
      
      const rawData = await response.json();
      
      // Transform the data to match the Person interface
      this.peopleData = rawData.map((person: any) => ({
        name: person.fullName,
        fullName: person.fullName,
        primaryRole: person.primaryRole,
        secondaryRoles: person.secondaryRoles ? person.secondaryRoles.split(',').map((r: string) => r.trim()) : [],
        mentions: person.mentions || 0,
        files: (person.fileReferences?.split(',')?.length || 0),
        contexts: this.generateContexts(person),
        evidence_types: person.keyEvidence?.split(',')?.map((e: string) => e.trim()) || [],
        spicy_passages: [],
        likelihood_score: this.mapLikelihood(person.likelihoodLevel),
        spice_score: this.calculateSpiceScore(person),
        spice_rating: this.calculateSpiceRating(person),
        spice_peppers: this.generatePeppers(person),
        spice_description: this.generateSpiceDescription(person),
        keyEvidence: person.keyEvidence,
        fileReferences: person.fileReferences,
        connectionsToEpstein: person.connectionsToEpstein
      }));

      return this.peopleData || [];
    } catch (error) {
      console.error('Error loading people data:', error);
      return [];
    }
  }

  async loadEvidenceData(): Promise<any> {
    if (this.evidenceData) {
      return this.evidenceData;
    }

    try {
      const response = await fetch('/data/evidence_database.json');
      if (!response.ok) {
        throw new Error('Failed to load evidence data');
      }
      
      this.evidenceData = await response.json();
      return this.evidenceData;
    } catch (error) {
      console.error('Error loading evidence data:', error);
      return null;
    }
  }

  private mapLikelihood(level: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (level === 'HIGH') return 'HIGH';
    if (level === 'MEDIUM') return 'MEDIUM';
    return 'LOW';
  }

  private calculateSpiceScore(person: any): number {
    // Calculate spice score based on mentions and evidence types
    const mentionScore = Math.min(person.mentions / 1000, 10);
    const evidenceScore = (person.keyEvidence?.split(',')?.length || 0) * 2;
    return Math.min(mentionScore + evidenceScore, 10);
  }

  private calculateSpiceRating(person: any): number {
    const score = this.calculateSpiceScore(person);
    return Math.min(Math.max(Math.floor(score / 2), 1), 5);
  }

  private generatePeppers(person: any): string {
    const rating = this.calculateSpiceRating(person);
    return '🌶️'.repeat(rating);
  }

  private generateSpiceDescription(person: any): string {
    const rating = this.calculateSpiceRating(person);
    const descriptions = {
      1: 'Mild - Basic mentions',
      2: 'Medium - Some involvement',
      3: 'Hot - Significant connections',
      4: 'Very Hot - Major involvement',
      5: 'Extreme - Critical subject'
    };
    return descriptions[rating as keyof typeof descriptions] || 'Unknown';
  }

  private generateContexts(person: any): Array<{file: string, context: string, date: string}> {
    // Generate sample contexts from file references
    const files = person.fileReferences?.split(',')?.slice(0, 3) || [];
    return files.map((file: string) => ({
      file: file.trim(),
      context: `${person.fullName} mentioned in ${file.trim()}`,
      date: 'Various dates'
    }));
  }

  getStats(people: RealPerson[]) {
    return {
      totalPeople: people.length,
      highRisk: people.filter(p => p.likelihood_score === 'HIGH').length,
      mediumRisk: people.filter(p => p.likelihood_score === 'MEDIUM').length,
      lowRisk: people.filter(p => p.likelihood_score === 'LOW').length,
      totalMentions: people.reduce((sum, p) => sum + p.mentions, 0),
      totalFiles: people.reduce((sum, p) => sum + p.files, 0)
    };
  }
}