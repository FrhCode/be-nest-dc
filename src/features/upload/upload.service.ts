import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  onModuleInit() {
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async handleUpload(file: Express.Multer.File): Promise<{ url: string }> {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    const dest = path.join(this.uploadDir, filename);

    await fs.promises.rename(file.path, dest);

    return { url: `/uploads/${filename}` };
  }
}
