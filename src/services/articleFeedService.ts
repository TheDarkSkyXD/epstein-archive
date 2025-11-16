export interface Article {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
  categories: string[];
  content: string;
  guid: string;
}

export class ArticleFeedService {
  private cache: Map<string, { articles: Article[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  async fetchArticles(feedUrl: string, tagFilter?: string): Promise<Article[]> {
    const cacheKey = `${feedUrl}:${tagFilter || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.articles;
    }

    try {
      const response = await fetch(feedUrl);
      const xmlText = await response.text();
      const articles = this.parseRSS(xmlText, tagFilter);
      
      this.cache.set(cacheKey, { articles, timestamp: Date.now() });
      return articles;
    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  }

  private parseRSS(xmlText: string, tagFilter?: string): Article[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      console.error('RSS parsing error:', parserError[0].textContent);
      return [];
    }

    const items = xmlDoc.getElementsByTagName('item');
    const articles: Article[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = this.getElementText(item, 'title') || 'Untitled';
      const link = this.getElementText(item, 'link') || '';
      const description = this.getElementText(item, 'description') || '';
      const pubDate = this.getElementText(item, 'pubDate') || '';
      const author = this.getElementText(item, 'author') || 'Unknown';
      const guid = this.getElementText(item, 'guid') || link;
      const content = this.getElementText(item, 'content:encoded') || description;

      // Extract categories/tags
      const categoryElements = item.getElementsByTagName('category');
      const categories: string[] = [];
      for (let j = 0; j < categoryElements.length; j++) {
        const category = categoryElements[j].textContent?.trim();
        if (category) {
          categories.push(category);
        }
      }

      // Apply tag filter if specified (case-insensitive)
      if (tagFilter) {
        const hasTag = categories.some(cat => 
          cat.toLowerCase().includes(tagFilter.toLowerCase()) ||
          title.toLowerCase().includes(tagFilter.toLowerCase()) ||
          description.toLowerCase().includes(tagFilter.toLowerCase())
        );
        
        if (!hasTag) {
          continue;
        }
      }

      articles.push({
        title: this.cleanText(title),
        link,
        description: this.cleanText(description),
        pubDate,
        author: this.cleanText(author),
        categories,
        content: this.cleanText(content),
        guid
      });
    }

    // Sort by publication date (newest first)
    return articles.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
  }

  private getElementText(parent: Element, tagName: string): string | null {
    const elements = parent.getElementsByTagName(tagName);
    if (elements.length > 0 && elements[0].textContent) {
      return elements[0].textContent.trim();
    }
    return null;
  }

  private cleanText(text: string): string {
    // Remove HTML tags and decode HTML entities
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || text;
  }

  formatPubDate(dateString: string): string {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
        }
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch {
      return dateString;
    }
  }

  truncateText(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
}