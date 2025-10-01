#!/bin/bash

echo "🚀 FLP AcademyWorks Railway Deployment Script"
echo "============================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

echo "📝 Instructions:"
echo "1. Make sure you're logged into Railway (railway login)"
echo "2. This script will deploy your app to Railway"
echo ""

# Navigate to project directory
cd "/Users/fitrijoroji/Cursor/FLP Works App"

# Check if linked to Railway project
if [ ! -f ".railway" ]; then
    echo "🔗 Linking to Railway project..."
    echo "When prompted, select 'Create New Project' and name it 'FLP Academyworks'"
    railway link
fi

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

# Get deployment URL
echo ""
echo "✅ Deployment complete!"
echo "📱 Your app will be available at the URL provided above"
echo "🔗 You can also run 'railway open' to view in browser"