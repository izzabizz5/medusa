import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

@Injectable()
export class ProxyService implements OnModuleInit {
  private readonly logger = new Logger(ProxyService.name);
  private pool: ProxyConfig[] = [];
  private lastReplenished = 0;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.replenishPool();
  }

  async getProxy(): Promise<ProxyConfig | null> {
    const now = Date.now();
    // Replenish every 30 minutes or when pool is low
    if (this.pool.length < 3 || now - this.lastReplenished > 30 * 60 * 1000) {
      await this.replenishPool();
    }
    return this.pool.shift() || null;
  }

  markFailed(proxy: ProxyConfig) {
    // Already removed from pool by shift(); log for diagnostics
    this.logger.warn(`Proxy failed: ${proxy.server}`);
  }

  private async replenishPool() {
    const provider = this.config.get('PROXY_PROVIDER', 'none');

    if (provider === 'webshare') {
      await this.fetchWebshareProxies();
    } else if (provider === 'none') {
      this.pool = [];
    }

    this.lastReplenished = Date.now();
    this.logger.log(`Proxy pool replenished: ${this.pool.length} proxies`);
  }

  private async fetchWebshareProxies() {
    const apiKey = this.config.get('WEBSHARE_API_KEY');
    if (!apiKey) return;

    try {
      const response = await axios.get('https://proxy.webshare.io/api/v2/proxy/list/', {
        headers: { Authorization: `Token ${apiKey}` },
        params: { mode: 'direct', page: 1, page_size: 50 },
      });

      this.pool = response.data.results.map((p: any) => ({
        server: `http://${p.proxy_address}:${p.port}`,
        username: p.username,
        password: p.password,
      }));
    } catch (err) {
      this.logger.error('Failed to fetch Webshare proxies: ' + err.message);
    }
  }
}
