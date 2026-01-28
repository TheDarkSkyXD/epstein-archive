import { getDb } from './connection.js';

export interface Article {
  id: number;
  title: string;
  link?: string;
  url?: string;
  source?: string;
  publication?: string;
  pub_date?: string;
  published_date?: string;
  description?: string;
  summary?: string;
  tags?: string;
  red_flag_rating?: number;
  image_url?: string;
  reading_time?: string;
}

export class ArticlesRepository {
  /**
   * Get paginated articles with optional filters
   */
  getArticles(
    limit: number = 50,
    offset: number = 0,
    search?: string,
    publication?: string,
    sort: 'date' | 'redFlag' = 'redFlag',
  ): { articles: Article[]; total: number } {
    const db = getDb();
    let query = 'SELECT * FROM articles WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM articles WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      const searchTerm = `%${search}%`;
      const searchClause = ` AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)`;
      query += searchClause;
      countQuery += searchClause;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (publication) {
      query += ` AND (source = ? OR publication = ?)`;
      countQuery += ` AND (source = ? OR publication = ?)`;
      params.push(publication, publication);
    }

    // Sorting
    if (sort === 'redFlag') {
      query += ' ORDER BY red_flag_rating DESC, pub_date DESC';
    } else {
      query += ' ORDER BY pub_date DESC';
    }

    // Pagination
    query += ' LIMIT ? OFFSET ?';

    // Get total count
    const countResult = db.prepare(countQuery).get(...params) as { total: number };

    // Get paginated items (add limit/offset to params)
    const articles = db.prepare(query).all(...params, limit, offset) as Article[];

    return {
      articles,
      total: countResult.total,
    };
  }

  getArticleById(id: number | string): Article | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article;
  }
}

export const articlesRepository = new ArticlesRepository();
