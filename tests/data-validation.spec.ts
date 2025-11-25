import { test, expect } from '@playwright/test';
import { peopleData } from '../src/data/peopleData';

test.describe('Data Validation Tests', () => {
  test('should have valid spice ratings for all people', () => {
    const people = Object.values(peopleData);
    
    people.forEach(person => {
      // Check spice rating is within valid range
      expect(person.spice_rating).toBeGreaterThanOrEqual(0);
      expect(person.spice_rating).toBeLessThanOrEqual(5);
      
      // Check spice score is non-negative
      expect(person.spice_score).toBeGreaterThanOrEqual(0);
      
      // Check spice peppers match the rating
      const expectedPeppers = '🌶️'.repeat(person.spice_rating);
      expect(person.spice_peppers).toBe(expectedPeppers || '🌶️');
      
      // Check spice description is not empty
      expect(person.spice_description).toBeTruthy();
      expect(person.spice_description.length).toBeGreaterThan(0);
    });
  });

  test('should have top spice ratings for key figures', () => {
    const topSpicyPeople = [
      'Donald Trump',
      'Ghislaine Maxwell',
      'Prince Andrew',
      'Bill Clinton',
      'Jeffrey Epstein',
      'Alan Dershowitz',
      'Virginia Roberts'
    ];

    topSpicyPeople.forEach(name => {
      const person = peopleData[name];
      expect(person).toBeDefined();
      expect(person.spice_rating).toBeGreaterThanOrEqual(3);
      expect(person.spice_score).toBeGreaterThanOrEqual(25);
    });
  });

  test('should have valid evidence types', () => {
    const validEvidenceTypes = [
      'email',
      'flight_log',
      'testimony',
      'legal',
      'document',
      'photo',
      'financial'
    ];

    const people = Object.values(peopleData);
    people.forEach(person => {
      person.evidence_types.forEach(type => {
        expect(validEvidenceTypes).toContain(type);
      });
    });
  });

  test('should have valid likelihood scores', () => {
    const validScores = ['HIGH', 'MEDIUM', 'LOW'];
    
    const people = Object.values(peopleData);
    people.forEach(person => {
      expect(validScores).toContain(person.likelihood_score);
    });
  });

  test('should have consistent mention counts', () => {
    const people = Object.values(peopleData);
    
    people.forEach(person => {
      // Mentions should be positive
      expect(person.mentions).toBeGreaterThan(0);
      
      // Files should be positive and less than or equal to mentions
      expect(person.files).toBeGreaterThan(0);
      expect(person.files).toBeLessThanOrEqual(person.mentions);
      
      // Contexts array should have at least one entry
      expect(person.contexts.length).toBeGreaterThan(0);
    });
  });

  test('should have valid spicy passages structure', () => {
    const people = Object.values(peopleData);
    
    people.forEach(person => {
      person.spicy_passages.forEach(passage => {
        expect(passage).toHaveProperty('keyword');
        expect(passage).toHaveProperty('passage');
        expect(passage).toHaveProperty('filename');
        
        expect(typeof passage.keyword).toBe('string');
        expect(typeof passage.passage).toBe('string');
        expect(typeof passage.filename).toBe('string');
        
        expect(passage.keyword.length).toBeGreaterThan(0);
        expect(passage.passage.length).toBeGreaterThan(0);
        expect(passage.filename.length).toBeGreaterThan(0);
      });
    });
  });

  test('should have spice score correlation with rating', () => {
    const people = Object.values(peopleData);
    
    people.forEach(person => {
      // Higher spice rating should generally mean higher spice score
      if (person.spice_rating === 5) {
        expect(person.spice_score).toBeGreaterThanOrEqual(50);
      } else if (person.spice_rating === 4) {
        expect(person.spice_score).toBeGreaterThanOrEqual(30);
      } else if (person.spice_rating === 3) {
        expect(person.spice_score).toBeGreaterThanOrEqual(20);
      } else if (person.spice_rating === 2) {
        expect(person.spice_score).toBeGreaterThanOrEqual(10);
      } else if (person.spice_rating === 1) {
        expect(person.spice_score).toBeGreaterThanOrEqual(5);
      }
    });
  });

  test('should have unique person names', () => {
    const names = Object.keys(peopleData);
    const uniqueNames = new Set(names);
    
    expect(names.length).toBe(uniqueNames.size);
  });

  test('should have valid file references', () => {
    const people = Object.values(peopleData);
    
    people.forEach(person => {
      person.contexts.forEach(context => {
        expect(context.file).toBeTruthy();
        expect(context.file.length).toBeGreaterThan(0);
        expect(context.file).toMatch(/\.txt$/); // Should end with .txt
      });
      
      person.spicy_passages.forEach(passage => {
        expect(passage.filename).toBeTruthy();
        expect(passage.filename.length).toBeGreaterThan(0);
      });
    });
  });
});