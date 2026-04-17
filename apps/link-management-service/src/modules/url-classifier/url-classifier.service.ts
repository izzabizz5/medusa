import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChildProcess, spawn } from 'child_process';

export interface ClassifyResult {
  url: string;
  score: number;
  isGood: boolean;
}

export interface TrainExample {
  url: string;
  is_good: boolean;
}

@Injectable()
export class UrlClassifierService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UrlClassifierService.name);
  private readonly baseUrl: string;
  private sidecarProcess: ChildProcess | null = null;
  private readonly autoStart: boolean;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get('CLASSIFIER_URL', 'http://localhost:8090');
    this.autoStart = config.get('AUTO_START_CLASSIFIER', 'false') === 'true';
  }

  async onModuleInit() {
    if (this.autoStart) {
      await this.startSidecar();
    }
  }

  async onModuleDestroy() {
    this.sidecarProcess?.kill();
  }

  private async startSidecar() {
    const pythonPath = this.config.get('PYTHON_PATH', 'python3');
    const scriptPath = this.config.get(
      'CLASSIFIER_SCRIPT_PATH',
      'python/classifier_service.py',
    );

    this.sidecarProcess = spawn(pythonPath, [scriptPath], {
      env: { ...process.env },
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    this.logger.log('Starting URL classifier sidecar...');
    await this.waitUntilReady();
    this.logger.log('URL classifier sidecar ready');
  }

  private async waitUntilReady(retries = 20, delayMs = 2000) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`${this.baseUrl}/health`);
        if (res.ok) return;
      } catch {
        // not ready yet
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    this.logger.warn('Classifier sidecar did not become ready — continuing without it');
  }

  async classifyBatch(urls: string[]): Promise<ClassifyResult[]> {
    if (!urls.length) return [];

    try {
      const res = await fetch(`${this.baseUrl}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) throw new Error(`Classifier returned ${res.status}`);
      const data = (await res.json()) as Array<{
        url: string;
        score: number;
        is_good: boolean;
      }>;

      return data.map((d) => ({ url: d.url, score: d.score, isGood: d.is_good }));
    } catch (err) {
      this.logger.warn(`Classifier unavailable: ${err.message} — defaulting all URLs to score=0.5`);
      return urls.map((url) => ({ url, score: 0.5, isGood: true }));
    }
  }

  async classifyUrl(url: string): Promise<ClassifyResult> {
    const results = await this.classifyBatch([url]);
    return results[0];
  }

  async retrain(examples: TrainExample[]): Promise<{ ok: boolean; modelType: string; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examples }),
      });

      if (!res.ok) throw new Error(`Train endpoint returned ${res.status}`);
      const data = (await res.json()) as {
        ok: boolean;
        model_type: string;
        n_examples: number;
        message: string;
      };

      this.logger.log(`Retrain: ${data.message} (model=${data.model_type}, n=${data.n_examples})`);
      return { ok: data.ok, modelType: data.model_type, message: data.message };
    } catch (err) {
      this.logger.error(`Retrain failed: ${err.message}`);
      return { ok: false, modelType: 'unknown', message: err.message };
    }
  }
}
