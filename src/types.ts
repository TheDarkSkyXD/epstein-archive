export interface Person {
  name: string;
  mentions: number;
  files: number;
  contexts: Array<{
    file: string;
    context: string;
    date: string;
  }>;
  evidence_types: string[];
  spicy_passages: Array<{
    keyword: string;
    passage: string;
    filename: string;
  }>;
  likelihood_score: 'HIGH' | 'MEDIUM' | 'LOW';
  spice_score: number;
  spice_rating: number;
  spice_peppers: string;
  spice_description: string;
}

export interface Mention {
  person: string;
  file: string;
  context: string;
  date?: string;
  type: 'email' | 'document' | 'testimony' | 'flight_record';
}

export interface Evidence {
  id: string;
  person: string;
  type: 'email' | 'document' | 'testimony' | 'flight_record' | 'photo';
  title: string;
  content: string;
  date?: string;
  fileReference: string;
  significance: 'high' | 'medium' | 'low';
}

export interface SearchFilters {
  likelihood: 'all' | 'HIGH' | 'MEDIUM' | 'LOW';
  role: 'all' | string;
  status: 'all' | string;
  minMentions: number;
}