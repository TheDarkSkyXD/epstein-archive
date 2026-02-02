## v11.7.0 (2026-02-02) - Bios, Codewords & Consolidation

### New Features

- **Entity Bio Integration**: Entity cards now display `bio`, `birthDate`, and `deathDate` (where available), providing immediate biographical context. Use of `break-words` ensures readability on mobile.
- **Codeword Discovery**: Explicitly identified 11 circle codewords (e.g., "Hotdog", "Pizza", "Map") as `Term` entities with "Key" icons. Bios for these terms explain their use as obfuscation tactics.
- **VIP Consolidation (Netanyahu)**: Added "Benjamin Netanyahu" to the VIP rules engine with aggressive alias matching (Bibi, Benjamin Nitay, etc.) to ensure fragmented references are consolidated into a single canonical entity profile.
- **Search Logic Update**: Fixed `ingest_intelligence.ts` to correctly persist `aliases` to the database, ensuring that searching for nicknames (e.g., "Bibi") correctly retrieves the canonical entity.

### Improvements

- **Media Gallery Polish**: Fixed a visual flicker in the `PhotoBrowser` by optimizing the loading spinner logic. The full-screen overlay now only appears on initial load, using a discreet spinner for updates.
- **Mobile UX**: Refined `MobileMenu` with a premium glassmorphism design and improved touch targets.

## v11.6.2 (2026-02-02) - Deep Link Social Previews

### Enhanced Social Media Support

- **Consistent Rich Previews**: Fixed social media cards for all deep link types.
- **Photo Deep Links**: Added support for both `?photoId=123` and clean `/media/photos/:id` URLs.
- **Audio Recordings**: Added rich previews for audio clips (including the "Riley Testimony") via `/media/audio?id=123`.
- **Investigations**: Added dynamic OG tags for specific investigations (`/investigations/:id`).

### Deployment

- Disabled "Deep Health Check" (PRAGMA integrity_check) on deployment to fallback to functional verification for large database compatibility.
