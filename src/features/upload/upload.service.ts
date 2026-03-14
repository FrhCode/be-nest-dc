import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly tempDir = path.join(process.cwd(), 'uploads', 'temp');

  onModuleInit() {
    fs.mkdirSync(this.uploadDir, { recursive: true });
    fs.mkdirSync(this.tempDir, { recursive: true });
  }

  async handleUpload(file: Express.Multer.File): Promise<{ url: string }> {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    const dest = path.join(this.tempDir, filename);

    await fs.promises.rename(file.path, dest);

    return { url: `/uploads/temp/${filename}` };
  }

  async promoteFile(tempUrl: string): Promise<string> {
    const filename = path.basename(tempUrl);
    const src = path.join(this.tempDir, filename);
    const dest = path.join(this.uploadDir, filename);

    await fs.promises.rename(src, dest);

    return `/uploads/${filename}`;
  }

  async deleteFile(url: string): Promise<void> {
    const filename = path.basename(url);
    const isTemp = url.includes('/uploads/temp/');
    const filePath = isTemp
      ? path.join(this.tempDir, filename)
      : path.join(this.uploadDir, filename);

    try {
      await fs.promises.unlink(filePath);
    } catch {
      // File may not exist — silently ignore
    }
  }

  isTempUrl(url: string): boolean {
    return url.startsWith('/uploads/temp/');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupTempFiles(): Promise<void> {
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    let files: string[];
    try {
      files = await fs.promises.readdir(this.tempDir);
    } catch {
      return;
    }

    for (const file of files) {
      const filePath = path.join(this.tempDir, file);
      try {
        const stat = await fs.promises.stat(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          await fs.promises.unlink(filePath);
          this.logger.log(`Deleted stale temp file: ${file}`);
        }
      } catch {
        // Skip files that can't be stat'd
      }
    }
  }
}
