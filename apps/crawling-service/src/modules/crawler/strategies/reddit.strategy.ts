import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface CrawledImageResult {
  imageUrl: string;
  pageUrl: string;
}

@Injectable()
export class RedditStrategy {
  private readonly logger = new Logger(RedditStrategy.name);
  private readonly REDDIT_USER_AGENT = 'MedusaProtection/1.0 (+https://medusa.com)';

  /**
   * Crawls a Reddit URL using the public JSON API (no auth required for public posts/subreddits).
   * Appends .json to any Reddit URL to get machine-readable data.
   */
  async crawl(url: string): Promise<CrawledImageResult[]> {
    const jsonUrl = this.toJsonUrl(url);
    this.logger.log(`Crawling Reddit JSON: ${jsonUrl}`);

    try {
      const response = await axios.get(jsonUrl, {
        headers: { 'User-Agent': this.REDDIT_USER_AGENT },
        timeout: 30000,
      });

      const images: CrawledImageResult[] = [];

      if (Array.isArray(response.data)) {
        // Post page: response is [postListing, commentListing]
        const posts = response.data[0]?.data?.children || [];
        for (const post of posts) {
          const extracted = this.extractFromPost(post.data);
          images.push(...extracted);
        }
      } else if (response.data?.data?.children) {
        // Subreddit listing
        for (const child of response.data.data.children) {
          const extracted = this.extractFromPost(child.data);
          images.push(...extracted);
        }
        // Handle pagination - crawl next page if available
        const after = response.data.data.after;
        if (after) {
          const nextUrl = `${jsonUrl.split('?')[0]}?after=${after}&limit=100`;
          const nextImages = await this.crawlPaginated(nextUrl, 3);
          images.push(...nextImages);
        }
      }

      return images;
    } catch (err) {
      this.logger.error(`Reddit crawl failed for ${url}: ${err.message}`);
      throw err;
    }
  }

  private async crawlPaginated(jsonUrl: string, maxPages: number): Promise<CrawledImageResult[]> {
    if (maxPages <= 0) return [];
    try {
      const response = await axios.get(jsonUrl, {
        headers: { 'User-Agent': this.REDDIT_USER_AGENT },
        timeout: 30000,
      });
      const images: CrawledImageResult[] = [];
      for (const child of response.data?.data?.children || []) {
        images.push(...this.extractFromPost(child.data));
      }
      const after = response.data?.data?.after;
      if (after) {
        const nextUrl = `${jsonUrl.split('?')[0]}?after=${after}&limit=100`;
        const nextImages = await this.crawlPaginated(nextUrl, maxPages - 1);
        images.push(...nextImages);
      }
      return images;
    } catch {
      return [];
    }
  }

  private extractFromPost(post: any): CrawledImageResult[] {
    const images: CrawledImageResult[] = [];
    if (!post) return images;

    const pageUrl = `https://www.reddit.com${post.permalink || ''}`;

    // Direct image link
    if (post.url && this.isImageUrl(post.url)) {
      images.push({ imageUrl: post.url, pageUrl });
    }

    // Reddit-hosted images (preview)
    if (post.preview?.images) {
      for (const img of post.preview.images) {
        const source = img.source;
        if (source?.url) {
          // Reddit HTML-encodes the preview URLs
          images.push({ imageUrl: source.url.replace(/&amp;/g, '&'), pageUrl });
        }
      }
    }

    // Gallery posts
    if (post.gallery_data?.items) {
      for (const item of post.gallery_data.items) {
        const mediaId = item.media_id;
        if (mediaId && post.media_metadata?.[mediaId]) {
          const meta = post.media_metadata[mediaId];
          if (meta.s?.u) {
            images.push({ imageUrl: meta.s.u.replace(/&amp;/g, '&'), pageUrl });
          }
        }
      }
    }

    return images;
  }

  private isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) ||
      url.includes('i.redd.it') ||
      url.includes('i.imgur.com');
  }

  private toJsonUrl(url: string): string {
    // Remove trailing slash, add .json, preserve query string
    const u = new URL(url);
    if (!u.pathname.endsWith('.json')) {
      u.pathname = u.pathname.replace(/\/?$/, '.json');
    }
    if (!u.searchParams.has('limit')) {
      u.searchParams.set('limit', '100');
    }
    return u.toString();
  }
}
