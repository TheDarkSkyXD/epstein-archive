# Epstein Archive Deployment Guide

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- SQLite3

## Deployment Steps

### 1. Initial Setup

1. Ensure you have the `epstein.db` database file in the project root directory
2. Install dependencies:
   ```bash
   npm install
   ```

### 2. Deploy the Application

Run the deployment script:
```bash
./deploy.sh
```

This script will:
- Stop any existing servers on ports 3012 and 4173
- Verify the database exists and check its contents
- Build the frontend application
- Start the API server on port 3012
- Start the frontend server on port 4173

### 3. Access the Application

Once deployed, the application will be available at:
- **Frontend**: http://localhost:4173
- **API**: http://localhost:3012
- **Health Check**: http://localhost:3012/api/health

### 4. Manual Deployment (Alternative)

If you prefer to start the services manually:

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the API server:
   ```bash
   npm run api:prod
   ```

3. In a separate terminal, start the frontend server:
   ```bash
   npm run preview
   ```

### 5. Stopping the Application

To stop the application, you can either:
1. Press Ctrl+C in the terminal where deploy.sh is running
2. Kill the processes manually:
   ```bash
   pkill -f "server.production.ts"
   pkill -f "vite preview"
   ```

### 6. Logs

The deployment script creates log files:
- `api-server.log` - API server logs
- `frontend-server.log` - Frontend server logs

## Database Information

The application uses `epstein.db` as its database file, which should contain:
- Entities: ~74,839 records
- Documents: ~2,646 records

## Troubleshooting

### Port Conflicts

If you encounter port conflicts:
```bash
# Kill processes on specific ports
lsof -ti:3012,4173 | xargs kill -9
```

### Database Issues

Ensure the `epstein.db` file exists and is not corrupted:
```bash
# Check database integrity
sqlite3 epstein.db "PRAGMA integrity_check;"
```

### Missing Dependencies

If you encounter module not found errors:
```bash
npm install
```

## Environment Variables

The application uses the following environment variables (defined in `.env.production`):
- `DATABASE_URL` - Path to the database file
- `API_PORT` - Port for the API server (default: 3012)
- `NODE_ENV` - Environment (production/development)