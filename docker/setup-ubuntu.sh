#!/bin/bash
# ============================================
# Remember Me - Ubuntu Server Setup Script
# ============================================
# Run this on a fresh Ubuntu 22.04/24.04 server
# bash docker/setup-ubuntu.sh

set -e

echo "🚀 Setting up Remember Me on Ubuntu..."
echo "======================================"

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo apt install -y docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Nginx (for standalone deployment)
echo "🌐 Installing Nginx..."
sudo apt install -y nginx certbot python3-certbot-nginx

# Install Node.js 20 (for PM2 deployment)
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Create project directory
echo "📁 Creating project directory..."
sudo mkdir -p /var/www/remember-me
sudo chown -R $USER:$USER /var/www/remember-me

# Setup firewall
echo "🛡️ Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw --force enable

# Setup swap (for smaller VMs)
echo "💾 Setting up swap..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo ""
echo "✅ Ubuntu setup completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Clone your project: git clone <repo-url> /var/www/remember-me"
echo "   2. Configure .env.production"
echo "   3. Set up SSL: sudo certbot --nginx -d your-domain.com"
echo "   4. Deploy: cd /var/www/remember-me && docker-compose up -d"
echo "   5. Or log out and back in for docker group changes to take effect"
echo ""
echo "🔍 Useful commands:"
echo "   docker-compose logs -f    # View all logs"
echo "   docker-compose ps         # Check service status"
echo "   docker-compose down       # Stop services"
echo "   docker-compose up -d      # Start services"
