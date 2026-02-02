## v11.6.2 (2026-02-02) - Deep Link Social Previews

### Enhanced Social Media Support

- **Consistent Rich Previews**: Fixed social media cards for all deep link types.
- **Photo Deep Links**: Added support for both `?photoId=123` and clean `/media/photos/:id` URLs.
- **Audio Recordings**: Added rich previews for audio clips (including the "Riley Testimony") via `/media/audio?id=123`.
- **Investigations**: Added dynamic OG tags for specific investigations (`/investigations/:id`).

### Deployment

- Disabled "Deep Health Check" (PRAGMA integrity_check) on deployment to fallback to functional verification for large database compatibility.
