#!/bin/bash
echo "🚀 Deploying Portfolio Optimization Dashboard to Production..."

# Build frontend
echo "📦 Building frontend..."
npm run build

# Create screenshots directory
mkdir -p screenshots

echo "📸 Screenshots ready to be taken at:"
echo "🌐 Local URL: http://localhost:3003"
echo "📊 API Docs: http://localhost:8000/docs"

# Serve locally for screenshots
echo "🏠 Starting local server for screenshots..."
npx serve dist -l 3004 -s &
SERVER_PID=$!

echo ""
echo "✅ Ready for deployment!"
echo ""
echo "📋 Manual Steps:"
echo "1. Take screenshots at http://localhost:3004"
echo "2. Deploy frontend: npx netlify deploy --prod --dir=dist"
echo "3. Deploy backend: Push to GitHub and connect to Render"
echo "4. Update README with live URLs"
echo ""
echo "🌐 Frontend will be available at: https://[your-app].netlify.app"
echo "📊 Backend will be available at: https://[your-app].onrender.com"

# Keep server running
echo "⏳ Local server running on port 3004 for screenshots..."
wait $SERVER_PID