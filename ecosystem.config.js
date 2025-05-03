module.exports = {
  apps: [
    {
      name: "task-api",
      script: "src/server.js",
      instances: "max",
      exec_mode: "cluster",
      instances: 1, // or more if your app supports it
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
}
