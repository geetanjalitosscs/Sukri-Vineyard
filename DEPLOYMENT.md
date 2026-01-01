# Deployment Guide - Ubuntu Server

This guide will help you deploy the sukri Vineyard application to your Ubuntu server:
- Backend: `103.14.120.163:8087`
- Frontend: `103.14.120.163:8088`

## 📋 Prerequisites

Before starting, ensure you have:
- Ubuntu server with SSH access (via PuTTY)
- Root or sudo access
- Domain name or IP address: `103.14.120.163`
- Port 8087 (backend) and 8088 (frontend) open in firewall

---

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your Server

1. Open PuTTY
2. Enter hostname: `103.14.120.163`
3. Port: `22` (default SSH port)
4. Click "Open" and login with your credentials

---

### Step 2: Update System and Install Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node --version  # Should show v18.x or higher
npm --version

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx (for reverse proxy - optional but recommended)
sudo apt install -y nginx

# Install Git (if not already installed)
sudo apt install -y git
```

---

### Step 3: Setup PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE sukri_vineyard;
CREATE USER sukri_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sukri_vineyard TO sukri_user;
ALTER USER sukri_user CREATEDB;
\q

# Exit PostgreSQL
```

**Important:** Replace `your_secure_password_here` with a strong password and save it for later.

---

### Step 4: Upload Your Project Files

You have two options:

#### Option A: Using Git (Recommended if you have a repository)

```bash
# Navigate to home directory
cd ~

# Clone your repository (replace with your actual repo URL)
git clone <your-repository-url> sukri_vineyard_s

# Or if you already have the files, use SCP/SFTP to upload
```

#### Option B: Using SCP/SFTP (If you have files locally)

1. Use WinSCP, FileZilla, or similar tool
2. Connect to `103.14.120.163`
3. Upload the entire `sukri_vineyard_s` folder to `/home/your-username/sukri_vineyard_s`

---

### Step 5: Setup Backend

```bash
# Navigate to project directory
cd ~/sukri_vineyard_s/backend

# Install dependencies
npm install

# Create .env file
nano .env
```

**Add the following content to `.env`:**

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sukri_vineyard
DB_USERNAME=sukri_user
DB_PASSWORD=your_secure_password_here

# Application
NODE_ENV=production
PORT=8087
HOST=0.0.0.0

# JWT Secret (CHANGE THIS TO A RANDOM STRING!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-$(openssl rand -hex 32)

# Frontend URL
FRONTEND_URL=http://103.14.120.163:8088
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Import database schema
sudo -u postgres psql -d sukri_vineyard -f ../database/sukri_vineyard.sql

# Build backend
npm run build

# Test backend (optional - to verify it works)
npm run start:prod
# Press Ctrl+C to stop after testing
```

---

### Step 6: Setup Frontend

```bash
# Navigate to project root
cd ~/sukri_vineyard_s

# Install dependencies
npm install

# Create .env.local file
nano .env.local
```

**Add the following content to `.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://103.14.120.163:8087/api
PORT=8088
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Build frontend for production
npm run build
```

---

### Step 7: Configure PM2 for Process Management

```bash
# Navigate to project directory
cd ~/sukri_vineyard_s

# Create PM2 ecosystem file
nano ecosystem.config.js
```

**Add the following content:**

```javascript
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
```

**Important:** Replace `your-username` with your actual username.

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Create logs directory
mkdir -p logs

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown (usually involves running a sudo command)
```

---

### Step 8: Configure Nginx (Reverse Proxy - Recommended)

This step is optional but recommended for better performance and security.

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/sukri-vineyard
```

**Add the following content:**

```nginx
# Backend API
server {
    listen 8087;
    server_name 103.14.120.163;

    location /api {
        proxy_pass http://localhost:8087;
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

# Frontend
server {
    listen 8088;
    server_name 103.14.120.163;

    location / {
        proxy_pass http://localhost:8088;
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
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/sukri-vineyard /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

**Note:** If you skip Nginx, the applications will run directly on ports 8087 (backend) and 8088 (frontend).

---

### Step 9: Configure Firewall

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow backend port
sudo ufw allow 8087/tcp

# Allow frontend port
sudo ufw allow 8088/tcp

# Allow HTTP/HTTPS (if using Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check firewall status
sudo ufw status
```

---

### Step 10: Verify Deployment

1. **Check PM2 Status:**
   ```bash
   pm2 status
   pm2 logs
   ```

2. **Check Backend:**
   Open browser: `http://103.14.120.163:8087/api/temperature/readings`
   Should return JSON data.

3. **Check Frontend:**
   Open browser: `http://103.14.120.163:8088`
   Should show the login page.

4. **Test Login:**
   Use demo credentials:
   - Email: `owner@sukrivineyard.com`
   - Password: `Admin@123`

---

## 🔧 Useful Commands

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs sukri-backend
pm2 logs sukri-frontend

# Restart applications
pm2 restart all
pm2 restart sukri-backend
pm2 restart sukri-frontend

# Stop applications
pm2 stop all

# Delete applications
pm2 delete all
```

### Database Commands

```bash
# Connect to database
sudo -u postgres psql -d sukri_vineyard

# Backup database
sudo -u postgres pg_dump sukri_vineyard > backup.sql

# Restore database
sudo -u postgres psql -d sukri_vineyard < backup.sql
```

### Nginx Commands

```bash
# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 🔄 Updating the Application

When you need to update the application:

```bash
# Navigate to project directory
cd ~/sukri_vineyard_s

# Pull latest changes (if using Git)
git pull

# Update backend
cd backend
npm install
npm run build
pm2 restart sukri-backend

# Update frontend
cd ..
npm install
npm run build
pm2 restart sukri-frontend
```

---

## 🐛 Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs

# Check if ports are in use
sudo netstat -tulpn | grep :8087
sudo netstat -tulpn | grep :8088

# Check system resources
free -h
df -h
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
sudo -u postgres psql -d sukri_vineyard

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :8088
sudo lsof -i :8087

# Kill process (replace PID with actual process ID)
sudo kill -9 <PID>
```

---

## 🔒 Security Recommendations

1. **Change Default Passwords:**
   - Database password
   - JWT secret
   - System user passwords

2. **Setup SSL/HTTPS:**
   - Use Let's Encrypt for free SSL certificates
   - Configure Nginx with SSL

3. **Regular Updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Firewall:**
   - Only open necessary ports
   - Use fail2ban for SSH protection

5. **Backup:**
   - Regular database backups
   - Code backups

---

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `journalctl -xe`
4. Verify all services are running: `pm2 status` and `sudo systemctl status postgresql`

---

**Deployment Complete! 🎉**

Your application should now be accessible at:
- Frontend: `http://103.14.120.163:8088`
- Backend API: `http://103.14.120.163:8087/api`

