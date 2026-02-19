-- Merge Jeffrey Epstein Duplicates
-- Master ID: 1
UPDATE entities SET canonical_id = 1 WHERE id IN (
    26246,  -- Defendant Jeffrey Epstein
    20641,  -- Financier Jeffrey Epstein
    19364,  -- Background Jeffrey Epstein
    70569,  -- Mango Jeffrey Epstein
    86844,  -- Article Jeffrey Epstein
    88986,  -- Defendants Jeffrey Epstein
    25773,  -- Magazine Jeffrey Epstein
    83791,  -- Close Jeffrey Epstein
    87388   -- Dehalfiagalingsti Jeffrey Epstein
);

-- Merge Ghislaine Maxwell Duplicates
-- Master ID: 2
UPDATE entities SET canonical_id = 2 WHERE id IN (
    97514,  -- Ghislaine Maxwell To
    97513,  -- Ghislaine Maxwell From
    158815, -- Ghislaine Maxwell Attorney
    156940, -- Ghislaine Maxwell Email
    102600, -- Ghislaine Maxwell Importance
    104728, -- Defendant Ghislaine Maxwell
    100071, -- Ghislaine Maxwell Privileged
    100073, -- Ghislaine Maxwell Hey
    101324  -- Ei Ghislaine Maxwell
);

-- Future: Add more automated cleanup based on heuristics
