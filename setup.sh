#!/bin/bash

echo "🚀 Setting up Bubble Social Media App..."
echo ""

# Check Node version
echo "✓ Checking Node.js..."
node --version

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create env file if it doesn't exist
if [ ! -f "src/config/env.ts" ]; then
    echo ""
    echo "⚠️  Please update src/config/env.ts with your backend URL"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update src/config/env.ts with your backend URL (use your computer's IP address)"
echo "2. Start backend: cd C:/Users/posta/bubble/backend && npm run dev"
echo "3. Start app: npm start"
echo ""
echo "Find your IP:"
echo "  Windows: ipconfig"
echo "  Mac/Linux: ifconfig | grep inet"
echo ""
