import express from 'express';
import cors from 'cors';
import { databaseService } from './src/services/DatabaseService';

const app = express();
const PORT = process.env.API_PORT || 3012;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: databaseService.isInitialized() ? 'connected' : 'not_initialized'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
});
