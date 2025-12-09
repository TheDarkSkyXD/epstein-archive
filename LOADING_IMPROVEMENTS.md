# Loading Improvements

## Changes Made

### 1. LoadingPill Component Update
- Consolidated the loading indicator into a single chip design
- Added a tiny loading bar below the text label
- Reduced the width of the progress bar from 24 units to 16 units for a more compact appearance
- Maintained all accessibility features including ARIA labels and screen reader support

### 2. Mobile Menu Verification
- Verified that all mobile menu buttons correctly navigate to their respective sections:
  - Subjects → `/people`
  - Search → `/search`
  - Documents → `/documents`
  - Investigations → `/investigations`
  - Black Book → `/blackbook`
  - Timeline → `/timeline`
  - Media → `/media`
  - Analytics → `/analytics`
  - About → `/about`

## Benefits
- More compact and visually appealing loading indicator
- Better use of space with the single chip design
- Consistent navigation experience across mobile and desktop
- Maintained all accessibility features

## Files Modified
- `src/components/LoadingPill.tsx` - Updated component design
- `src/components/MobileMenu.tsx` - Verified navigation paths (no changes needed)