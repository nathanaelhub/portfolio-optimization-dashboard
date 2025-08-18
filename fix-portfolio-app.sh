#!/bin/bash
echo "🔧 Fixing Portfolio Optimization Dashboard..."

# Fix frontend dependencies
echo "📦 Installing frontend dependencies..."
docker exec portfolio-optimization-dashboard-frontend-1 npm install react-hook-form d3 jspdf html2canvas framer-motion

# Fix backend requirements
echo "🐍 Fixing backend dependencies..."
cd backend
echo "PyJWT==2.8.0" >> requirements.txt
echo "python-jose[cryptography]==3.3.0" >> requirements.txt
cd ..

# Fix database URL
echo "🗄️ Fixing database configuration..."
sed -i '' 's/portfolio_user/portfolio_db/g' backend/.env 2>/dev/null || true

# Rebuild and restart
echo "🚀 Rebuilding services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "✅ Fix complete! Opening dashboard..."
sleep 10
open http://localhost:3000