#!/bin/bash
# ============================================
# Remember Me - Production Deployment Script
# ============================================
# Usage: bash docker/deploy.sh
# Prerequisites: Docker and Docker Compose installed

set -e

echo "🚀 Remember Me Deployment Script"
echo "================================"

# Check requirements
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }

# Check for .env.production
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "   Copy .env.example to .env.production and configure it:"
    echo "   cp .env.example .env.production"
    exit 1
fi

echo "📦 Pulling latest images..."
docker-compose pull

echo "🏗️  Building containers..."
docker-compose build --no-cache

echo "🛑 Stopping existing containers..."
docker-compose down || true

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "✅ Deployment completed successfully!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001/api"
echo "   Docs:     http://localhost:3001/api/docs"
echo ""
echo "📝 Next steps:"
echo "   1. Configure your domain DNS to point to this server"
echo "   2. Set up SSL certificates with certbot"
echo "   3. Update .env.production with your production values"
echo "   4. Run: docker-compose logs -f (to view logs)"
