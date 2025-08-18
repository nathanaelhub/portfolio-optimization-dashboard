#!/bin/bash
echo "🚀 Deploying Portfolio Optimization Dashboard..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build

# Deploy to Vercel (if authenticated)
echo "🌐 Deploying to Vercel..."
npx vercel --prod --yes || echo "⚠️ Vercel deployment failed - please authenticate with 'vercel login'"

# Serve locally as backup
echo "🏠 Starting local server as backup..."
npx serve dist -l 3000 -s &
SERVER_PID=$!

echo "✅ Deployment complete!"
echo "🌐 Live URL: Check Vercel output above"
echo "🏠 Local URL: http://localhost:3000"
echo "📚 API Documentation: http://localhost:8000/docs"

# Keep local server running
wait $SERVER_PID