// PM2 ecosystem file — AI Private Tutor
// pm2 start ecosystem.config.cjs --env production
// pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: "ai-private-tutor",
      cwd: "/home/ubuntu/ai-private-tutor",
      script: "npm start -- -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      env_production: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/home/ubuntu/ai-private-tutor/logs/err.log",
      out_file: "/home/ubuntu/ai-private-tutor/logs/out.log",
    },
  ],
};
