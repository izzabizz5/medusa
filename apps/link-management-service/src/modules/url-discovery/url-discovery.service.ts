import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UrlClassifierService } from '../url-classifier/url-classifier.service';
import { TargetUrlsService } from '../target-urls/target-urls.service';
import { Platform } from '../../entities/target-url.entity';

export interface DiscoveryResult {
  found: number;
  autoAdded: number;
  pendingReview: number;
  discarded: number;
}

type DiscoverySource = 'seed_url' | 'search_query';

export interface DiscoverJobPayload {
  source: DiscoverySource;
  value: string;
}

// Minimum score to auto-activate a discovered URL (skip review queue)
const AUTO_ACTIVATE_THRESHOLD = 0.70;
// Minimum score to add as inactive (pending human review)
const PENDING_REVIEW_THRESHOLD = 0.45;

@Injectable()
export class UrlDiscoveryService {
  private readonly logger = new Logger(UrlDiscoveryService.name);

  constructor(
    private readonly classifier: UrlClassifierService,
    private readonly targetUrlsService: TargetUrlsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Fetch a seed URL and extract all external links from its HTML.
   * Classifies each and ingests the good ones.
   */
  async discoverFromSeedUrl(seedUrl: string): Promise<DiscoveryResult> {
    this.logger.log(`Discovering from seed URL: ${seedUrl}`);
    const links = await this.extractLinksFromPage(seedUrl);
    return this.ingestDiscoveredUrls(links, seedUrl);
  }

  /**
   * Search DuckDuckGo (no API key needed) for a query and ingest result URLs.
   */
  async discoverFromSearchQuery(query: string): Promise<DiscoveryResult> {
    this.logger.log(`Discovering via search: "${query}"`);
    const links = await this.searchDuckDuckGo(query);
    return this.ingestDiscoveredUrls(links, `search:${query}`);
  }

  /**
   * Use existing active target URLs as seeds — follow their domain's root
   * to discover related pages/galleries.
   */
  async discoverFromKnownDomains(): Promise<DiscoveryResult> {
    const active = await this.targetUrlsService.findActive();
    if (!active.length) return { found: 0, autoAdded: 0, pendingReview: 0, discarded: 0 };

    let total: DiscoveryResult = { found: 0, autoAdded: 0, pendingReview: 0, discarded: 0 };

    // Take a random sample of up to 10 active URLs to follow links from
    const sample = active.sort(() => Math.random() - 0.5).slice(0, 10);

    for (const target of sample) {
      try {
        const result = await this.discoverFromSeedUrl(target.url);
        total.found += result.found;
        total.autoAdded += result.autoAdded;
        total.pendingReview += result.pendingReview;
        total.discarded += result.discarded;
      } catch (err) {
        this.logger.warn(`Failed to discover from ${target.url}: ${err.message}`);
      }
    }

    return total;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async ingestDiscoveredUrls(
    rawUrls: string[],
    source: string,
  ): Promise<DiscoveryResult> {
    const result: DiscoveryResult = { found: rawUrls.length, autoAdded: 0, pendingReview: 0, discarded: 0 };
    if (!rawUrls.length) return result;

    // Deduplicate
    const unique = [...new Set(rawUrls)].slice(0, 200); // cap per run

    const classifications = await this.classifier.classifyBatch(unique);

    for (const { url, score, isGood } of classifications) {
      if (score < PENDING_REVIEW_THRESHOLD) {
        result.discarded++;
        continue;
      }

      const platform = this.guessPlatform(url);
      const isActive = score >= AUTO_ACTIVATE_THRESHOLD;

      try {
        await this.targetUrlsService.createDiscovered({
          url,
          platform,
          mlScore: score,
          isActive,
        });

        if (isActive) result.autoAdded++;
        else result.pendingReview++;
      } catch {
        // Likely a duplicate — skip silently
        result.discarded++;
      }
    }

    this.logger.log(
      `Discovery from "${source}": found=${result.found} ` +
        `autoAdded=${result.autoAdded} pendingReview=${result.pendingReview} discarded=${result.discarded}`,
    );

    return result;
  }

  private async extractLinksFromPage(pageUrl: string): Promise<string[]> {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MedusaBot/1.0)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) return [];
      const html = await res.text();
      return this.extractHrefs(html, pageUrl);
    } catch (err) {
      this.logger.warn(`Page fetch failed for ${pageUrl}: ${err.message}`);
      return [];
    }
  }

  private async searchDuckDuckGo(query: string): Promise<string[]> {
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MedusaBot/1.0)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) return [];
      const html = await res.text();

      // DDG HTML results: extract URLs from uddg= redirect parameters
      const uddgMatches = [...html.matchAll(/uddg=([^&"]+)/g)];
      const decoded = uddgMatches
        .map((m) => {
          try {
            return decodeURIComponent(m[1]);
          } catch {
            return null;
          }
        })
        .filter((u): u is string => !!u && u.startsWith('http'));

      // Filter to actual web pages — reject assets, stylesheets, images, etc.
      const filtered = decoded.filter((url) => this.isWebPage(url));

      return [...new Set(filtered)];
    } catch (err) {
      this.logger.warn(`DuckDuckGo search failed: ${err.message}`);
      return [];
    }
  }

  /** Reject URLs that point to assets instead of actual web pages. */
  private isWebPage(url: string): boolean {
    const lower = url.toLowerCase();
    // Reject direct links to images, stylesheets, scripts, fonts, etc.
    const assetExtensions = /\.(css|js|svg|ico|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|pdf|zip|mp4|mp3|xml|json|rss)(\?|$)/;
    if (assetExtensions.test(lower)) return false;
    // Reject common CDN/asset hostnames
    if (/cdn\.|static\.|assets\.|fonts\.|media\./.test(lower)) return false;
    // Reject DuckDuckGo's own links
    if (lower.includes('duckduckgo.com')) return false;
    return true;
  }

  private extractHrefs(html: string, baseUrl: string): string[] {
    const hrefRegex = /href=["']([^"']+)["']/gi;
    const matches = [...html.matchAll(hrefRegex)];
    const base = new URL(baseUrl);

    const urls: string[] = [];
    for (const m of matches) {
      try {
        const href = m[1];
        // Skip anchors, javascript, mailto, data URIs
        if (href.startsWith('#') || href.startsWith('javascript:') ||
            href.startsWith('mailto:') || href.startsWith('data:')) continue;

        const resolved = new URL(href, base);

        // Only http/https
        if (!['http:', 'https:'].includes(resolved.protocol)) continue;

        // Skip same-domain internal links (we want new domains)
        if (resolved.hostname === base.hostname) continue;

        urls.push(resolved.href);
      } catch {
        // Invalid URL — skip
      }
    }
    return urls;
  }

  private guessPlatform(url: string): Platform {
    const lower = url.toLowerCase();
    if (lower.includes('reddit.com')) return Platform.REDDIT;
    if (lower.includes('pinterest.com')) return Platform.PINTEREST;
    if (lower.includes('instagram.com')) return Platform.INSTAGRAM;
    return Platform.GENERIC_EXPLICIT;
  }
}
