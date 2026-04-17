import { Injectable } from '@nestjs/common';

export interface ExtractedImage {
  imageUrl: string;
  pageUrl: string;
}

// Asset paths that are never real photos
const JUNK_PATTERNS = [
  /favicon/i, /icon/i, /logo/i, /avatar/i, /sprite/i, /badge/i,
  /emoji/i, /button/i, /arrow/i, /banner/i, /pixel/i, /spacer/i,
  /loading/i, /spinner/i, /placeholder/i,
  /\/static\//i, /\/assets\//i, /\/css\//i, /\/js\//i, /\/fonts\//i,
  /\.svg(\?|$)/i, /\.ico(\?|$)/i, /\.gif(\?|$)/i, /\.bmp(\?|$)/i,
  /\.css(\?|$)/i, /\.woff/i, /\.ttf(\?|$)/i, /\.eot(\?|$)/i,
  /data:image\/svg/i, /data:image\/gif/i,
  /1x1\./i, /transparent\./i, /blank\./i,
  /google-analytics/i, /doubleclick/i, /facebook\.com\/tr/i,
  /cloudflare/i, /recaptcha/i,
];

// Only allow real photo formats
const PHOTO_EXTENSIONS = /\.(jpg|jpeg|png|webp)(\?|$)/i;

@Injectable()
export class ImageExtractorService {
  extractFromHtml(html: string, pageUrl: string): ExtractedImage[] {
    const images: ExtractedImage[] = [];
    const seen = new Set<string>();

    // og:image meta tags (highest quality, usually the main image)
    const ogMatches = html.matchAll(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi);
    for (const match of ogMatches) {
      const url = this.resolveUrl(match[1], pageUrl);
      if (url && this.isRealPhoto(url) && !seen.has(url)) {
        seen.add(url);
        images.push({ imageUrl: url, pageUrl });
      }
    }

    // <img> src attributes
    const imgMatches = html.matchAll(/<img[^>]+src="([^"]+)"/gi);
    for (const match of imgMatches) {
      const url = this.resolveUrl(match[1], pageUrl);
      if (url && this.isRealPhoto(url) && !seen.has(url)) {
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
        if (url && this.isRealPhoto(url) && !seen.has(url)) {
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

  /** Only accept jpg/jpeg/png/webp that don't match junk patterns. */
  private isRealPhoto(url: string): boolean {
    // Must be an actual photo file type
    if (!PHOTO_EXTENSIONS.test(url)) return false;

    // Reject anything matching junk patterns
    for (const pattern of JUNK_PATTERNS) {
      if (pattern.test(url)) return false;
    }

    return true;
  }
}
