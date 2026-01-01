module.exports = {
  apps: [
    {
      name: 'sukri-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
        PORT: 8087,
        HOST: '0.0.0.0',
        FRONTEND_URL: 'http://103.14.120.163:8088'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'sukri-frontend',
      cwd: './',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 8088,
        NEXT_PUBLIC_API_URL: 'http://103.14.120.163:8087/api'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
