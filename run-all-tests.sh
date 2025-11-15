#!/bin/bash

echo "🚀 Running Complete Test Suite for Motivational Quotes Application"
echo "=================================================================="

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Server is running on port 3000"
else
    echo "❌ Server is not running. Please start the server with 'npm start'"
    exit 1
fi

echo ""
echo "📊 Running Backend API Tests..."
echo "--------------------------------"
node test-quotes-functionality.js

echo ""
echo "🌐 Frontend Test Page Available"
echo "------------------------------"
echo "📱 Main Application: http://localhost:3000"
echo "🔧 Admin Panel: http://localhost:3000/admin"
echo "🧪 Frontend Test Page: http://localhost:3000/test-frontend-functionality.html"

echo ""
echo "🎯 Quick Manual Tests"
echo "--------------------"
echo "1. Visit http://localhost:3000 and verify:"
echo "   - Daily quote loads"
echo "   - Random quote button works"
echo "   - Search functionality works"
echo "   - Dark mode toggle works"
echo "   - Navigation is responsive"

echo ""
echo "2. Visit http://localhost:3000/admin and verify:"
echo "   - Admin panel loads"
echo "   - Statistics display correctly"
echo "   - Dark mode toggle works"
echo "   - Forms work properly"

echo ""
echo "3. Visit http://localhost:3000/test-frontend-functionality.html and verify:"
echo "   - All API tests pass"
echo "   - Quotes display correctly"
echo "   - Search functionality works"

echo ""
echo "✅ Test suite completed! Check the results above."