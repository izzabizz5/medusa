import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, BrowserContext } from 'playwright';
import { ProxyService } from '../../proxy/proxy.service';
import { ImageExtractorService, ExtractedImage } from '../../image-extractor/image-extractor.service';

@Injectable()
export class GenericStrategy {
  private readonly logger = new Logger(GenericStrategy.name);
  private browser: Browser | null = null;

  constructor(
    private readonly proxyService: ProxyService,
    private readonly imageExtractor: ImageExtractorService,
    private readonly config: ConfigService,
  ) {}

  async crawl(url: string): Promise<ExtractedImage[]> {
    this.logger.log(`Generic crawl: ${url}`);
    const proxy = await this.proxyService.getProxy();
    const context = await this.getContext(proxy);

    try {
      const page = await context.newPage();
      page.setDefaultTimeout(parseInt(this.config.get('PLAYWRIGHT_TIMEOUT_MS', '30000')));

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Scroll to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);

      const html = await page.content();
      const images = this.imageExtractor.extractFromHtml(html, url);

      // Also grab any dynamically loaded <img> elements — filter to real photos only
      const dynamicImages = await page.$$eval('img[src]', (imgs) =>
        (imgs as HTMLImageElement[])
          .filter((img) => {
            // Skip tiny images (icons, spacers, tracking pixels)
            if (img.naturalWidth < 150 || img.naturalHeight < 150) return false;
            const src = img.src.toLowerCase();
            // Skip non-photo formats
            if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(src)) return false;
            // Skip common junk paths
            if (/favicon|icon|logo|sprite|avatar|banner|static\/|assets\/|\.svg|\.ico/.test(src)) return false;
            return true;
          })
          .map((img) => img.src),
      );

      for (const imgSrc of dynamicImages) {
        if (imgSrc && !images.find((i) => i.imageUrl === imgSrc)) {
          images.push({ imageUrl: imgSrc, pageUrl: url });
        }
      }

      await page.close();
      return images;
    } catch (err) {
      if (proxy) this.proxyService.markFailed(proxy);
      this.logger.error(`Generic crawl failed for ${url}: ${err.message}`);
      throw err;
    } finally {
      await context.close();
    }
  }

  private async getContext(proxy: any): Promise<BrowserContext> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: this.config.get('PLAYWRIGHT_HEADLESS', 'true') === 'true',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }

    const contextOptions: any = {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    };

    if (proxy) {
      contextOptions.proxy = {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password,
      };
    }

    return this.browser.newContext(contextOptions);
  }

  async onModuleDestroy() {
    if (this.browser) await this.browser.close();
  }
}
