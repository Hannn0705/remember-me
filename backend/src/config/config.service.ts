import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private readonly envConfig: Record<string, string> = {};

  constructor() {
    this.loadEnvFile();
  }

  private loadEnvFile() {
    const envPath = path.resolve(process.cwd(), '.env');
    const examplePath = path.resolve(process.cwd(), '.env.example');

    let filePath = envPath;
    if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
      this.logger.warn('.env not found, loading from .env.example');
      filePath = examplePath;
    }

    if (!fs.existsSync(filePath)) {
      this.logger.warn('No .env file found, using process.env');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Only set if not already in process.env
      if (!process.env[key]) {
        process.env[key] = value;
      }
      this.envConfig[key] = process.env[key] || value;
    }
    this.logger.log(`Loaded ${Object.keys(this.envConfig).length} env vars`);
  }

  get(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }

  getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key);
    return value ? parseInt(value, 10) : defaultValue || 0;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key);
    if (!value) return defaultValue || false;
    return value.toLowerCase() === 'true' || value === '1';
  }
}
