@echo off
echo 🚀 Setting up Bubble Social Media App...
echo.

REM Check Node version
echo ✓ Checking Node.js...
node --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update src/config/env.ts with your backend URL
echo 2. Find your IP: ipconfig (look for IPv4 Address)
echo 3. Start backend: cd C:\Users\posta\bubble\backend ^&^& npm run dev
echo 4. Start app: npm start
echo.
pause
