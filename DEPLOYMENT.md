# Deployment Guide

## Quick Start (Local Development)

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
```bash
# Copy the example environment file
copy .env.example .env.local
```

3. **Configure database:**
Edit `.env.local` with your PostgreSQL connection string:
```
DATABASE_URL="postgresql://username:password@localhost:5432/job_tracker?schema=public"
```

4. **Set up database:**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

5. **Start development server:**
```bash
npm run dev
```

6. **Open application:**
Visit [http://localhost:3000](http://localhost:3000)

## Production Deployment to 46.62.205.150

### Option 1: Docker Deployment

1. **Build and run with Docker Compose:**
```bash
# Build the application
npm run build

# Start with Docker Compose
docker-compose up -d
```

2. **Access the application:**
Visit [http://46.62.205.150:3000](http://46.62.205.150:3000)

### Option 2: Manual Server Deployment

1. **Prepare the server:**
```bash
# SSH into your server
ssh root@46.62.205.150

# Install Node.js and PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs postgresql postgresql-contrib

# Create database
sudo -u postgres createdb job_tracker
```

2. **Deploy the application:**
```bash
# Upload files to server (using SCP or Git)
scp -r . root@46.62.205.150:/opt/job-tracker/

# SSH into server and set up
ssh root@46.62.205.150
cd /opt/job-tracker

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with production database URL

# Set up database
npm run db:generate
npm run db:push

# Build and start
npm run build
npm start
```

3. **Set up reverse proxy (optional):**
```bash
# Install nginx
apt-get install nginx

# Create nginx config
cat > /etc/nginx/sites-available/job-tracker << 'EOF'
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
EOF

# Enable site
ln -s /etc/nginx/sites-available/job-tracker /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Option 3: Vercel Deployment (Recommended)

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/job-tracker.git
git push -u origin main
```

2. **Deploy with Vercel:**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Set environment variables:
  - `DATABASE_URL`: Your PostgreSQL connection string
- Deploy

3. **Update domain:**
- In Vercel dashboard, add custom domain: `46.62.205.150`
- Or use the Vercel-provided domain

## Environment Variables

Required environment variables for production:

```bash
DATABASE_URL="postgresql://username:password@host:5432/job_tracker?schema=public"
NODE_ENV="production"
NEXTAUTH_URL="http://46.62.205.150"
NEXTAUTH_SECRET="your-secret-key-here"
```

## Database Setup

1. **Create PostgreSQL database:**
```sql
CREATE DATABASE job_tracker;
CREATE USER job_tracker_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE job_tracker TO job_tracker_user;
```

2. **Run migrations:**
```bash
npm run db:push
```

## Monitoring and Maintenance

1. **Check application status:**
```bash
# If using Docker
docker-compose ps

# If using PM2
pm2 status
```

2. **View logs:**
```bash
# Docker logs
docker-compose logs -f

# PM2 logs
pm2 logs job-tracker
```

3. **Update application:**
```bash
git pull origin main
npm install
npm run build
# Restart application
```

## Troubleshooting

### Common Issues:

1. **Database connection failed:**
   - Check DATABASE_URL in .env.local
   - Ensure PostgreSQL is running
   - Verify database credentials

2. **Port already in use:**
   - Change port in package.json or use different port
   - Kill existing process: `lsof -ti:3000 | xargs kill`

3. **Build errors:**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run lint`

4. **Permission denied:**
   - Check file permissions
   - Use sudo if necessary for system operations

## Security Considerations

1. **Environment variables:**
   - Never commit .env files
   - Use strong passwords for database
   - Rotate secrets regularly

2. **Database security:**
   - Use strong passwords
   - Limit database user permissions
   - Enable SSL connections

3. **Application security:**
   - Keep dependencies updated
   - Use HTTPS in production
   - Implement proper authentication (future enhancement)
