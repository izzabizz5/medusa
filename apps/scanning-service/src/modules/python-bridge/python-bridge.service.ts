import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { FaceEmbeddingResult } from '@medusa/shared';

@Injectable()
export class PythonBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PythonBridgeService.name);
  private readonly bridgeUrl: string;
  private sidecarProcess: ChildProcess | null = null;

  constructor(private readonly config: ConfigService) {
    this.bridgeUrl = config.get('PYTHON_BRIDGE_URL', 'http://localhost:8080');
  }

  async onModuleInit() {
    if (this.config.get('AUTO_START_PYTHON', 'true') === 'true') {
      await this.startSidecar();
    }
    await this.waitForReady();
  }

  async onModuleDestroy() {
    if (this.sidecarProcess) {
      this.sidecarProcess.kill();
      this.sidecarProcess = null;
    }
  }

  async embedImage(storageKey?: string, imageUrl?: string): Promise<FaceEmbeddingResult> {
    try {
      const response = await axios.post(
        `${this.bridgeUrl}/embed`,
        { storage_key: storageKey, image_url: imageUrl },
        { timeout: 60000 },
      );
      const data = response.data;
      return {
        vector: data.vector || [],
        modelName: data.model_name,
        hasFace: data.has_face,
        faceCount: data.face_count,
      };
    } catch (err) {
      this.logger.error(`Python bridge embed failed: ${err.message}`);
      throw err;
    }
  }

  private async startSidecar() {
    this.logger.log('Starting Python FastAPI sidecar...');
    const pythonPath = this.config.get('PYTHON_PATH', 'python3');
    const scriptPath = this.config.get('PYTHON_SCRIPT_PATH', 'python/main.py');

    this.sidecarProcess = spawn(pythonPath, [scriptPath], {
      env: {
        ...process.env,
        PYTHON_BRIDGE_PORT: this.config.get('PYTHON_BRIDGE_PORT', '8080'),
      },
      stdio: 'inherit',
    });

    this.sidecarProcess.on('exit', (code) => {
      this.logger.warn(`Python sidecar exited with code ${code}`);
      this.sidecarProcess = null;
    });
  }

  private async waitForReady(retries = 30, delayMs = 2000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await axios.get(`${this.bridgeUrl}/health`, { timeout: 5000 });
        this.logger.log('Python sidecar is ready');
        return;
      } catch {
        this.logger.log(`Waiting for Python sidecar... (${i + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    this.logger.warn('Python sidecar did not become ready in time — proceeding anyway');
  }
}
