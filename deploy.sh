#!/bin/bash

# AI-Powered Job Application Tracker Deployment Script
# Target Server: 46.62.205.150

echo "🚀 Starting deployment to 46.62.205.150..."

# Set variables
SERVER_IP="46.62.205.150"
SERVER_USER="root"  # Adjust as needed
APP_NAME="job-tracker"
APP_PORT="3000"

echo "📦 Building the application..."
npm run build

echo "🐳 Building Docker image..."
docker build -t $APP_NAME .

echo "📤 Uploading to server..."
# Note: You'll need to set up SSH keys or use password authentication
# scp -r . $SERVER_USER@$SERVER_IP:/opt/$APP_NAME/

echo "🔧 Setting up on server..."
# SSH commands to run on the server
cat << 'EOF' | ssh $SERVER_USER@$SERVER_IP
# Create app directory
mkdir -p /opt/job-tracker
cd /opt/job-tracker

# Install Docker and Docker Compose if not already installed
apt-get update
apt-get install -y docker.io docker-compose

# Start the application
docker-compose up -d

# Set up nginx reverse proxy (optional)
cat > /etc/nginx/sites-available/job-tracker << 'NGINX_EOF'
server {
    listen 80;
    server_name 46.62.205.150;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

# Enable the site
ln -sf /etc/nginx/sites-available/job-tracker /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "✅ Deployment completed!"
echo "🌐 Application available at: http://46.62.205.150"
EOF

echo "🎉 Deployment script completed!"
echo "🌐 Your application should be available at: http://46.62.205.150"
