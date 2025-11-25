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
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: databaseService.isInitialized() ? 'connected' : 'not_initialized'
  });
});

// Get database statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await databaseService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
});