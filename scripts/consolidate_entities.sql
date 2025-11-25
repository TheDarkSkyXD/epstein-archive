-- Consolidate Donald Trump variations
UPDATE entities SET full_name = 'Donald Trump' WHERE full_name = 'Donald J. Trump';
UPDATE entities SET mentions = mentions + (SELECT mentions FROM entities WHERE full_name = 'President Trump') WHERE full_name = 'Donald Trump';
UPDATE entities SET mentions = mentions + (SELECT mentions FROM entities WHERE full_name = 'President Donald Trump') WHERE full_name = 'Donald Trump';
DELETE FROM entities WHERE full_name IN ('President Trump', 'President Donald Trump');

-- Consolidate Ghislaine Maxwell variations
UPDATE entities SET full_name = 'Ghislaine Maxwell' WHERE full_name = 'Ghislaine Noelle Marion Maxwell';
UPDATE entities SET mentions = mentions + (SELECT mentions FROM entities WHERE full_name = 'Miss Maxwell') WHERE full_name = 'Ghislaine Maxwell';
DELETE FROM entities WHERE full_name = 'Miss Maxwell';

-- Consolidate Jeffrey Epstein variations
UPDATE entities SET mentions = mentions + (SELECT mentions FROM entities WHERE full_name = 'Mr Epstein') WHERE full_name = 'Jeffrey Epstein';
UPDATE entities SET mentions = mentions + (SELECT mentions FROM entities WHERE full_name = 'Jeffrey Edward Epstein') WHERE full_name = 'Jeffrey Epstein';
DELETE FROM entities WHERE full_name IN ('Mr Epstein', 'Jeffrey Edward Epstein', 'Jeffery Epstein');

-- Boost scores to ensure they are at the top
UPDATE entities SET spice_score = 200000, spice_rating = 5 WHERE full_name = 'Jeffrey Epstein';
UPDATE entities SET spice_score = 190000, spice_rating = 5 WHERE full_name = 'Ghislaine Maxwell';
UPDATE entities SET spice_score = 180000, spice_rating = 5 WHERE full_name = 'Donald Trump';

-- Clean up some junk entities
DELETE FROM entities WHERE full_name IN ('The', 'And', 'But', 'Or', 'If', 'When', 'Then', 'Because', 'While', 'After', 'Before');
DELETE FROM entities WHERE length(full_name) < 3;
