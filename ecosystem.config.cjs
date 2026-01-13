/**
 * PM2 Ecosystem Configuration for Epstein Archive
 *
 * PORT ASSIGNMENTS (MUST MATCH NGINX):
 * - glasscode.academy/api/* → 8080 (this app)
 * - glasscode.academy/* → 3000 (Next.js frontend, separate PM2 process)
 * - epstein.academy/* → 3012 (legacy, routed via Nginx)
 *
 * CRITICAL: Do not change PORT without updating Nginx config!
 */
module.exports = {
  apps: [
    {
      name: 'epstein-archive',
      script: 'dist/server.js',
      instances: 1, // Single instance for SQLite (no locking issues)
      exec_mode: 'fork', // CRITICAL: Must be 'fork' not 'cluster' for SQLite!

      // === RELIABILITY SETTINGS ===
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000, // Give 5s for graceful shutdown & DB close

      // Prevent infinite restart loops
      min_uptime: '10s', // Must run 10s before considered "started"
      max_restarts: 10, // Max restarts within restart_delay window
      restart_delay: 5000, // 5s between restarts (prevents hammering)

      // === HEALTH MONITORING ===
      // PM2 will check this endpoint; restart if unhealthy
      // Requires: pm2 install pm2-health (optional but recommended)

      // === LOGGING ===
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // === ENVIRONMENT ===
      env: {
        NODE_ENV: 'production',
        DB_PATH: './epstein-archive.db',
        PORT: 3012, // CRITICAL: Must match Nginx proxy_pass for glasscode.academy
        RAW_CORPUS_BASE_PATH: './data',
        CORS_ORIGIN:
          'https://epstein.academy,https://www.epstein.academy,https://glasscode.academy,https://www.glasscode.academy',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3012, // Using alternate port to avoid conflict with glasscode backend
        DB_PATH: './epstein-archive.db',
        RAW_CORPUS_BASE_PATH: './data',
      },
    },
  ],
};
