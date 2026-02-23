import { db, articlesQueries } from '@epstein/db';

export interface Article {
  id: string;
  title: string;
  link?: string;
  url?: string;
  source?: string;
  publication?: string;
  pubDate?: string;
  description?: string;
  summary?: string;
  tags?: string;
  redFlagRating?: number;
  imageUrl?: string;
  readingTime?: string;
}

export class ArticlesRepository {
  /**
   * Get paginated articles with optional filters
   */
  async getArticles(
    limit: number = 50,
    offset: number = 0,
    search?: string,
    publication?: string,
    sort: 'date' | 'redFlag' = 'redFlag',
  ): Promise<{ articles: any[]; total: number }> {
    const [articles, countResult] = await Promise.all([
      articlesQueries.getArticles.run(
        {
          limit: BigInt(limit),
          offset: BigInt(offset),
          search: search ? `%${search}%` : null,
          publication: publication || null,
          sortBy: sort,
        },
        db,
      ),
      articlesQueries.countArticles.run(
        {
          search: search ? `%${search}%` : null,
          publication: publication || null,
        },
        db,
      ),
    ]);

    return {
      articles: articles.map((a) => ({
        ...a,
        id: String(a.id),
      })),
      total: Number(countResult[0]?.total || 0),
    };
  }

  async getArticleById(id: number | string): Promise<any | undefined> {
    const rows = await articlesQueries.getArticleById.run({ id: BigInt(id) }, db);
    if (!rows[0]) return undefined;
    return {
      ...rows[0],
      id: String(rows[0].id),
    };
  }

  /**
   * Insert or update an article (Consolidated from legacy articleRepository)
   */
  async insertArticle(article: any): Promise<void> {
    try {
      await articlesQueries.insertArticle.run(
        {
          title: article.title,
          link: article.link,
          description: article.description || '',
          content: article.content || '',
          pubDate: article.pubDate || null,
          author: article.author || 'Unknown',
          source: article.source || 'rss',
          imageUrl: article.imageUrl || null,
          guid: article.guid || article.link,
          redFlagRating: article.redFlagRating || 0,
        },
        db,
      );
    } catch (error) {
      console.error('[ArticlesRepository] Error inserting article:', error);
      throw error;
    }
  }
}

export const articlesRepository = new ArticlesRepository();
