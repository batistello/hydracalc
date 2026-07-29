module.exports = {
  apps: [
    {
      name: 'hydracalc',
      script: 'server/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3030
      },
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
