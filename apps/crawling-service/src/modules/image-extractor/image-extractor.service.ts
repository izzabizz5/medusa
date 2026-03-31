import { Injectable } from '@nestjs/common';

export interface ExtractedImage {
  imageUrl: string;
  pageUrl: string;
}

@Injectable()
export class ImageExtractorService {
  // Extract image URLs from raw HTML
  extractFromHtml(html: string, pageUrl: string): ExtractedImage[] {
    const images: ExtractedImage[] = [];
    const seen = new Set<string>();

    // og:image meta tags (highest quality, usually the main image)
    const ogMatches = html.matchAll(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi);
    for (const match of ogMatches) {
      const url = this.resolveUrl(match[1], pageUrl);
      if (url && !seen.has(url)) {
        seen.add(url);
        images.push({ imageUrl: url, pageUrl });
      }
    }

    // <img> src attributes
    const imgMatches = html.matchAll(/<img[^>]+src="([^"]+)"/gi);
    for (const match of imgMatches) {
      const url = this.resolveUrl(match[1], pageUrl);
      if (url && this.isLikelyPhoto(url) && !seen.has(url)) {
        seen.add(url);
        images.push({ imageUrl: url, pageUrl });
      }
    }

    // srcset attributes (grab the largest)
    const srcsetMatches = html.matchAll(/srcset="([^"]+)"/gi);
    for (const match of srcsetMatches) {
      const parts = match[1].split(',').map((s) => s.trim().split(/\s+/));
      const largest = parts.reduce((a, b) => {
        const aSize = parseInt(a[1]) || 0;
        const bSize = parseInt(b[1]) || 0;
        return bSize > aSize ? b : a;
      });
      if (largest[0]) {
        const url = this.resolveUrl(largest[0], pageUrl);
        if (url && this.isLikelyPhoto(url) && !seen.has(url)) {
          seen.add(url);
          images.push({ imageUrl: url, pageUrl });
        }
      }
    }

    return images;
  }

  private resolveUrl(url: string, base: string): string | null {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null;
    try {
      return new URL(url, base).href;
    } catch {
      return null;
    }
  }

  private isLikelyPhoto(url: string): boolean {
    const lower = url.toLowerCase();
    // Filter out tiny icons/logos
    if (lower.includes('icon') || lower.includes('logo') || lower.includes('avatar')) {
      return false;
    }
    return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower) || lower.includes('/image/') || lower.includes('/photo/');
  }
}
