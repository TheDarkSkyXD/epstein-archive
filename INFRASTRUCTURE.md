# Infrastructure Documentation

This document captures critical infrastructure configuration to prevent deployment failures.

## Production Server

- **Host**: `194.195.248.217` (SSH alias: `glasscode`)
- **User**: `deploy`
- **App Path**: `/home/deploy/epstein-archive`

## Port Configuration

> ⚠️ **CRITICAL**: The application MUST run on port **8080** for `glasscode.academy`.

| Domain | Nginx Proxy Target | Notes |
|--------|-------------------|-------|
| `glasscode.academy` | `http://127.0.0.1:8080` | Main archive application |
| `epstein.academy` | `http://127.0.0.1:3012` | Legacy/alternate domain |

### ecosystem.config.cjs

```javascript
env: {
  PORT: 8080,  // MUST be 8080 for glasscode.academy
  // ...
}
```

## Nginx Configuration

The Nginx config for `glasscode.academy` (`/etc/nginx/sites-enabled/glasscode.academy.conf`) routes:

- `/api/*` → `http://127.0.0.1:8080/` (strips `/api` prefix!)
- `/` → `http://127.0.0.1:3000` (Next.js frontend on glasscode.academy)

### Important: Path Stripping

Nginx strips the `/api` prefix when proxying. If your app expects `/api/stats`, the request arrives as `/stats`.

**Solution**: Either configure Nginx to preserve the path OR add middleware to rewrite.

## Database Schema Requirements

See `scripts/verify_deployment.ts` for the authoritative list of required tables and columns.

Key tables:
- `entities` (columns: `full_name`, `primary_role`, `red_flag_rating`, `red_flag_score`)
- `documents` (columns: `is_hidden`)
- `black_book_entries`

## Deployment Checklist

Before every deployment:

1. ✅ Run `npx tsx scripts/verify_deployment.ts`
2. ✅ Ensure `ecosystem.config.cjs` has `PORT: 8080`
3. ✅ Run `npm run build:prod`
4. ✅ Execute `./deploy-to-production.sh`
5. ✅ Verify all health checks pass

## Rollback Procedure

If deployment fails:

```bash
# SSH to server
ssh glasscode

# Check logs
pm2 logs epstein-archive --lines 100

# Rollback to previous working state (if backup exists)
# TODO: Implement automated backup/rollback
```

## Contact

For infrastructure issues, check:
- PM2 status: `pm2 status`
- Nginx status: `sudo systemctl status nginx`
- Port bindings: `ss -tulpn | grep 8080`
