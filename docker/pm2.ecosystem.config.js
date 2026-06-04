// PM2 Ecosystem Configuration
// For non-Docker deployment
//
// Usage: pm2 start docker/pm2.ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'remember-me-backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_file: '../.env.production',
      max_memory_restart: '500M',
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'remember-me-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '../.env.production',
      max_memory_restart: '500M',
      error_file: '../logs/frontend-error.log',
      out_file: '../logs/frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
