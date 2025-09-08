# 🚀 Deployment Guide

## Quick Deployment Steps

### 1. Frontend to Vercel
```bash
cd frontend
npm run build
vercel --prod
# Follow the prompts and get your live URL
```

### 2. Backend to Render
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Connect your GitHub repository
4. Use these settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `CORS_ORIGINS`: Your Vercel frontend URL
     - `SECRET_KEY`: Generate a secure key

### 3. Update URLs
- Update `VITE_API_URL` in Vercel environment variables
- Update README.md with your live URLs

## Environment Variables

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend.onrender.com
```

### Backend (Render)
```
CORS_ORIGINS=https://your-frontend.vercel.app
SECRET_KEY=your-secret-key-here
DATABASE_URL=optional-postgres-url
REDIS_URL=optional-redis-url
```

## Testing Deployment
1. Visit your frontend URL
2. Test portfolio optimization
3. Check API docs at `your-backend-url/docs`
4. Verify mobile responsiveness

## Troubleshooting
- **CORS Issues**: Check CORS_ORIGINS environment variable
- **Build Failures**: Verify all dependencies in requirements.txt
- **Slow Cold Starts**: Normal on free Render tier, upgrade if needed

🎉 **You're live!** Share your URLs and showcase your work!