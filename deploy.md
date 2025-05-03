# Deployment Guide for Task Management App

This guide details how to deploy the Task Management application to Azure with NGINX as a load balancer, using PM2 for process management, and implementing CI/CD with GitHub or GitLab.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Azure VM Setup](#azure-vm-setup)
4. [Application Deployment](#application-deployment)
5. [PM2 Setup](#pm2-setup)
6. [NGINX Configuration](#nginx-configuration)
7. [Domain Setup](#domain-setup)
8. [SSL Certificate with Let's Encrypt](#ssl-certificate-with-lets-encrypt)
9. [CI/CD Setup](#cicd-setup)
   - [GitHub Actions](#github-actions)
   - [GitLab CI/CD](#gitlab-cicd)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Architecture Overview

The deployment will consist of:

- **Azure Virtual Machine(s)** hosting the application
- **NGINX** as a reverse proxy and load balancer
- **PM2** for Node.js process management
- **MongoDB** database (Azure Cosmos DB with MongoDB API or a separate VM)
- **Multiple domains**:
  - `tasks.onestoptech.co.in` - Frontend
  - `admin.onestoptech.co.in` - Admin Panel
  - `taskapi.onestoptech.co.in` - API Endpoints

## Prerequisites

- Azure account with subscription
- Domain names configured with DNS provider
- GitHub or GitLab repository with your application code
- Local development environment for testing

## Azure VM Setup

### 1. Create an Azure Virtual Machine

1. Log in to the [Azure Portal](https://portal.azure.com)
2. Create a new Virtual Machine:
   - Select "Virtual Machines" → "Add" → "Virtual Machine"
   - Choose Ubuntu Server 20.04 LTS or later
   - Recommended size: Standard B2s (2 vCPUs, 4 GB RAM) or larger for production
   - Enable HTTP (80), HTTPS (443), and SSH (22) ports
   - Use SSH key authentication for better security

### 2. Set Up Basic Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install firewall
sudo apt install ufw -y

# Configure firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 3. Install Required Software

```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (if hosting the database on the same server)
# Note: For production, consider using Azure Cosmos DB with MongoDB API
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 globally
sudo npm install -g pm2

# Install NGINX
sudo apt install -y nginx
```

## Application Deployment

### 1. Clone the Repository

```bash
# Create directory for application
mkdir -p /var/www
cd /var/www

# Clone the repository
git clone https://github.com/yourusername/task-management-app.git
cd task-management-app

# Install dependencies
npm install --production
```

### 2. Configure Environment Variables

Create a `.env` file with the necessary environment variables:

```bash
cat > .env << EOF
PORT=3000
MONGO_URI=mongodb://localhost:27017/taskapp
JWT_SECRET=your_secure_random_string
NODE_ENV=production
EOF

# Set appropriate permissions
chmod 600 .env
```

## PM2 Setup

PM2 will manage the Node.js processes, ensuring they stay running and can automatically restart if they crash.

### 1. Create PM2 Configuration

Create an `ecosystem.config.js` file:

```bash
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: "task-api",
      script: "src/server.js",
      instances: "max",
      exec_mode: "cluster",
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
EOF
```

### 2. Start the Application with PM2

```bash
# Start the application
pm2 start ecosystem.config.js --env production

# Save the PM2 configuration to restart on server reboot
pm2 save

# Setup PM2 to start on system startup
pm2 startup
# Run the command that PM2 outputs
```

## NGINX Configuration

NGINX will act as a reverse proxy and load balancer, distributing requests across PM2 instances.

### 1. Create NGINX Configuration Files

Create separate configuration files for each domain:

**Frontend (tasks.onestoptech.co.in)**

```bash
sudo cat > /etc/nginx/sites-available/tasks.onestoptech.co.in << EOF
server {
    listen 80;
    server_name tasks.onestoptech.co.in;
    
    location / {
        root /var/www/task-management-app/public;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # For specific routes that need the backend
    location /login {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /register {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
```

**Admin Panel (admin.onestoptech.co.in)**

```bash
sudo cat > /etc/nginx/sites-available/admin.onestoptech.co.in << EOF
server {
    listen 80;
    server_name admin.onestoptech.co.in;
    
    location / {
        proxy_pass http://localhost:3000/admin/dashboard;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
```

**API (taskapi.onestoptech.co.in)**

```bash
sudo cat > /etc/nginx/sites-available/taskapi.onestoptech.co.in << EOF
server {
    listen 80;
    server_name taskapi.onestoptech.co.in;
    
    location / {
        proxy_pass http://localhost:3000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
```

### 2. Enable the NGINX Configurations

```bash
# Create symbolic links
sudo ln -s /etc/nginx/sites-available/tasks.onestoptech.co.in /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.onestoptech.co.in /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/taskapi.onestoptech.co.in /etc/nginx/sites-enabled/

# Test the NGINX configuration
sudo nginx -t

# Restart NGINX
sudo systemctl restart nginx
```

## Domain Setup

### 1. DNS Configuration

In your DNS provider (e.g., GoDaddy, Cloudflare, etc.), create A records for each domain pointing to your Azure VM's public IP address:

- `tasks.onestoptech.co.in` → [Your VM IP]
- `admin.onestoptech.co.in` → [Your VM IP]
- `taskapi.onestoptech.co.in` → [Your VM IP]

Allow time for DNS propagation (can take up to 48 hours, but often much faster).

## SSL Certificate with Let's Encrypt

Secure your domains with free SSL certificates from Let's Encrypt using Certbot.

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificates

```bash
# Obtain certificates for all domains
sudo certbot --nginx -d tasks.onestoptech.co.in -d admin.onestoptech.co.in -d taskapi.onestoptech.co.in

# Follow the prompts to set up SSL
# Choose to redirect HTTP to HTTPS when asked
```

Certbot will automatically update your NGINX configuration files to use HTTPS.

### 3. Set Up Auto-renewal

Certificates from Let's Encrypt expire after 90 days. Set up auto-renewal:

```bash
# Test the renewal process
sudo certbot renew --dry-run

# Certbot installs a cron job or systemd timer automatically to handle renewals
```

## CI/CD Setup

### GitHub Actions

#### 1. Create a GitHub Actions Workflow File

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to Azure VM

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Deploy to Azure VM
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/task-management-app
            git pull
            npm ci --production
            pm2 reload all
```

#### 2. Set Up GitHub Repository Secrets

In your GitHub repository:
1. Go to Settings → Secrets → New repository secret
2. Add the following secrets:
   - `HOST`: Your Azure VM's IP address
   - `USERNAME`: SSH username
   - `SSH_PRIVATE_KEY`: Private SSH key for authentication

### GitLab CI/CD

#### 1. Create a GitLab CI/CD Configuration File

Create `.gitlab-ci.yml` in your repository:

```yaml
stages:
  - test
  - deploy

test:
  stage: test
  image: node:16
  script:
    - npm ci
    - npm test

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk update && apk add openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
  script:
    - ssh -o StrictHostKeyChecking=no $USERNAME@$HOST "cd /var/www/task-management-app && git pull && npm ci --production && pm2 reload all"
  only:
    - main
```

#### 2. Set Up GitLab CI/CD Variables

In your GitLab project:
1. Go to Settings → CI/CD → Variables
2. Add the following variables:
   - `HOST`: Your Azure VM's IP address
   - `USERNAME`: SSH username
   - `SSH_PRIVATE_KEY`: Private SSH key for authentication

## Monitoring and Maintenance

### 1. PM2 Monitoring

```bash
# Monitor running processes
pm2 monit

# View logs
pm2 logs

# Check status
pm2 status
```

### 2. NGINX Monitoring

```bash
# Check NGINX status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### 3. Setup Basic Monitoring with PM2 Plus

```bash
# Connect to PM2 Plus for remote monitoring
pm2 plus
```

### 4. Regular Maintenance

- **Database Backups**: Set up regular MongoDB backups
- **Security Updates**: Regularly update system packages
- **SSL Renewal**: Ensure Certbot is renewing SSL certificates

```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Check certificate status
sudo certbot certificates
```

## Scaling Considerations

For higher traffic demands, consider:

1. **Vertical Scaling**: Increase VM resources (CPU, RAM)
2. **Horizontal Scaling**: Add more VMs and use NGINX for load balancing
3. **Managed Services**: Consider Azure App Service or Azure Kubernetes Service for easier scaling
4. **Database Scaling**: Migrate to Azure Cosmos DB for MongoDB for better performance and scalability

## Troubleshooting

### Application Issues
- Check PM2 logs: `pm2 logs`
- Verify environment variables: `pm2 env [app-id]`

### NGINX Issues
- Test configuration: `sudo nginx -t`
- Check error logs: `sudo tail -f /var/log/nginx/error.log`

### SSL Issues
- Verify certificates: `sudo certbot certificates`
- Renew manually if needed: `sudo certbot renew`

## Conclusion

This deployment setup provides a robust foundation for running your Task Management application on Azure with multiple domain support, secure HTTPS, and automated deployments. Monitor the application regularly and adjust resources as needed based on traffic and usage patterns. 