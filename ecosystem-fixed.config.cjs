module.exports = {
  apps: [
    {
      name: 'epstein-archive-api',
      script: 'api-server.cjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3012,
        DB_PATH: '/opt/epstein-archive/epstein-archive.db'
      },
      error_file: '/var/log/epstein-archive/api-error.log',
      out_file: '/var/log/epstein-archive/api-out.log',
      log_file: '/var/log/epstein-archive/api-combined.log',
      time: true
    },
    {
      name: 'epstein-archive-web',
      script: 'npx',
      args: 'serve dist -l 3005',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/epstein-archive/web-error.log',
      out_file: '/var/log/epstein-archive/web-out.log',
      log_file: '/var/log/epstein-archive/web-combined.log',
      time: true
    }
  ]
};