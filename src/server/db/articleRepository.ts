import { getDb } from './connection.js';

export const articleRepository = {
  // Insert an article into the database
  insertArticle: (article: any) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO articles (
        title, link, description, content, pub_date, author, source, image_url, guid, red_flag_rating
      ) VALUES (
        @title, @link, @description, @content, @pub_date, @author, @source, @image_url, @guid, @red_flag_rating
      )
      ON CONFLICT(link) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP
    `);

    try {
      stmt.run({
        title: article.title,
        link: article.link,
        description: article.description || '',
        content: article.content || '',
        pub_date: article.pubDate,
        author: article.author || 'Unknown',
        source: article.source || 'rss',
        image_url: article.imageUrl || null,
        guid: article.guid || article.link,
        red_flag_rating: article.redFlagRating || 0
      });
    } catch (error) {
      console.error('Error inserting article:', error);
    }
  },

  // Get all articles
  getArticles: async () => {
    const db = getDb();
    const articles = db.prepare(`
      SELECT * FROM articles 
      ORDER BY red_flag_rating DESC, pub_date DESC
    `).all() as any[];
    
    return articles.map(a => ({
      id: a.id,
      title: a.title,
      url: a.link,
      author: a.author,
      publication: a.source, // Map source -> publication
      published_date: a.pub_date, // Map pub_date -> published_date
      summary: a.description, // Map description -> summary
      content: a.content,
      tags: '', // Articles from RSS don't have tags column yet, return empty
      redFlagRating: a.red_flag_rating,
      created_at: a.created_at
    }));
  }
};