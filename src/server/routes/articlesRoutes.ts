import express from 'express';
import { articlesRepository } from '../db/articlesRepository.js';

const router = express.Router();

// GET /api/articles
router.get('/', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string) || undefined;
    const publication = (req.query.publication as string) || undefined;
    const sort = (req.query.sort as 'date' | 'redFlag') || 'redFlag';

    const result = articlesRepository.getArticles(limit, offset, search, publication, sort);

    res.json({
      data: result.articles,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/articles/:id
router.get('/:id', (req, res) => {
  try {
    const article = articlesRepository.getArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

export default router;
