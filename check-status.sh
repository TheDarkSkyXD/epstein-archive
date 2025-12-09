#!/bin/bash

# Script to check the status of the Epstein Archive application

echo "🔍 Checking Epstein Archive Application Status..."

# Check if processes are running
API_PID=$(lsof -ti:3012 2>/dev/null)
FRONTEND_PID=$(lsof -ti:4173 2>/dev/null)

if [[ -n "$API_PID" ]]; then
    echo "✅ API Server: Running (PID: $API_PID)"
else
    echo "❌ API Server: Not running"
fi

if [[ -n "$FRONTEND_PID" ]]; then
    echo "✅ Frontend Server: Running (PID: $FRONTEND_PID)"
else
    echo "❌ Frontend Server: Not running"
fi

# Check database
if [[ -f "epstein.db" ]]; then
    ENTITY_COUNT=$(sqlite3 epstein.db "SELECT COUNT(*) FROM entities;" 2>/dev/null || echo "0")
    DOCUMENT_COUNT=$(sqlite3 epstein.db "SELECT COUNT(*) FROM documents;" 2>/dev/null || echo "0")
    echo "📊 Database: $ENTITY_COUNT entities, $DOCUMENT_COUNT documents"
else
    echo "❌ Database: epstein.db not found"
fi

# Check health endpoint if API is running
if [[ -n "$API_PID" ]]; then
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3012/api/health 2>/dev/null || echo "000")
    if [[ "$HEALTH_STATUS" == "200" ]]; then
        echo "✅ API Health: OK"
    else
        echo "❌ API Health: HTTP $HEALTH_STATUS"
    fi
fi

# Check frontend if running
if [[ -n "$FRONTEND_PID" ]]; then
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/ 2>/dev/null || echo "000")
    if [[ "$FRONTEND_STATUS" == "200" ]]; then
        echo "✅ Frontend: Accessible"
    else
        echo "❌ Frontend: HTTP $FRONTEND_STATUS"
    fi
fi

echo ""
echo "_PORTS INFORMATION_"
echo "Frontend: http://localhost:4173"
echo "API: http://localhost:3012"
echo "Health Check: http://localhost:3012/api/health"