import { test, expect } from '@playwright/test';
import { peopleData } from '../src/data/peopleData';

test.describe('Data Validation Tests', () => {
  test('should have valid red flag ratings for all people', () => {
    const people = Object.values(peopleData);
    
    people.forEach(person => {
      // Check red flag rating is within valid range
      expect(person.red_flag_rating !== undefined ? person.red_flag_rating : 0).toBeGreaterThanOrEqual(0);
      expect(person.red_flag_rating !== undefined ? person.red_flag_rating : 0).toBeLessThanOrEqual(5);
      
      // Check red flag score is non-negative
      expect(person.red_flag_score !== undefined ? person.red_flag_score : 0).toBeGreaterThanOrEqual(0);
      
      // Check red flag peppers match the rating
      const expectedPeppers = '🚩'.repeat(person.red_flag_rating !== undefined ? person.red_flag_rating : 0);
      expect(person.red_flag_peppers).toBe(expectedPeppers || '🏳️');
      
      // Check red flag description is not empty
      expect(person.red_flag_description).toBeTruthy();
      expect(person.red_flag_description && person.red_flag_description.length > 0).toBeTruthy();
    });
  });

  test('should have top red flag ratings for key figures', () => {
    const topRedFlagPeople = [
      'Donald Trump',
      'Ghislaine Maxwell',
      'Prince Andrew',
      'Bill Clinton',
      'Jeffrey Epstein',
      'Alan Dershowitz',
      'Virginia Roberts'
    ];

    topRedFlagPeople.forEach(name => {
      const person = peopleData[name];
      expect(person).toBeDefined();
      expect(person.red_flag_rating !== undefined ? person.red_flag_rating : 0).toBeGreaterThanOrEqual(3);
      expect(person.red_flag_score !== undefined ? person.red_flag_score : 0).toBeGreaterThanOrEqual(25);
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

  test('should have valid red flag passages structure', () => {
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

  test('should have red flag score correlation with rating', () => {
    const people = Object.values(peopleData);
    
    people.forEach(person => {
      // Higher red flag rating should generally mean higher red flag score
      const redFlagRating = person.red_flag_rating !== undefined ? person.red_flag_rating : 0;
      const redFlagScore = person.red_flag_score !== undefined ? person.red_flag_score : 0;
      
      if (redFlagRating === 5) {
        expect(redFlagScore).toBeGreaterThanOrEqual(50);
      } else if (redFlagRating === 4) {
        expect(redFlagScore).toBeGreaterThanOrEqual(30);
      } else if (redFlagRating === 3) {
        expect(redFlagScore).toBeGreaterThanOrEqual(20);
      } else if (redFlagRating === 2) {
        expect(redFlagScore).toBeGreaterThanOrEqual(10);
      } else if (redFlagRating === 1) {
        expect(redFlagScore).toBeGreaterThanOrEqual(5);
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