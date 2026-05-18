import { Controller, Post, Get, Delete, Param, Req, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../guards/auth.guard';
import { Response } from 'express';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'winaity',
  secretKey: process.env.MINIO_SECRET_KEY || 'winaity123',
});

const BUCKET = process.env.MINIO_BUCKET || 'templates';

// Ensure bucket exists and is public on startup
async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET);
    }
    // Set public read policy
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET}/*`],
      }],
    });
    await minioClient.setBucketPolicy(BUCKET, policy);
    console.log(`MinIO bucket "${BUCKET}" ready (public read)`);
  } catch (err) {
    console.error('MinIO bucket setup failed:', err);
  }
}
ensureBucket();

@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: any, @Req() req: any, @Res() res: Response) {
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Validate file type
    const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const allowedVideos = ['video/mp4', 'video/webm', 'video/ogg'];
    const allowed = [...allowedImages, ...allowedVideos];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Type de fichier non autorisé. Utilisez JPG, PNG, GIF, WebP, SVG, MP4, WebM ou OGG.' });
    }

    // Max 50MB for videos, 5MB for images
    const isVideo = allowedVideos.includes(file.mimetype);
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({ error: `Le fichier ne doit pas dépasser ${isVideo ? '50' : '5'} Mo` });
    }

    try {
      const tenantId = req.user?.tenant_id || 'default';
      const ext = file.originalname.split('.').pop() || 'png';
      const fileName = `${tenantId}/${uuid()}.${ext}`;

      await minioClient.putObject(BUCKET, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });

      // MINIO_PUBLIC_URL is what the browser uses (host-mapped port);
      // MINIO_ENDPOINT/MINIO_PORT are for the gateway → MinIO server-to-server call.
      const publicBase =
        process.env.MINIO_PUBLIC_URL ||
        `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`;
      const url = `${publicBase}/${BUCKET}/${fileName}`;

      return res.json({
        url,
        fileName,
        size: file.size,
        type: file.mimetype,
      });
    } catch (err) {
      console.error('Upload failed:', err);
      return res.status(500).json({ error: "Échec de l'upload" });
    }
  }

  @Get(':tenantId/:fileName')
  async getFile(@Param('tenantId') tenantId: string, @Param('fileName') fileName: string, @Res() res: Response) {
    try {
      const stream = await minioClient.getObject(BUCKET, `${tenantId}/${fileName}`);
      stream.pipe(res);
    } catch {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }
  }

  @Delete(':tenantId/:fileName')
  async deleteFile(@Param('tenantId') tenantId: string, @Param('fileName') fileName: string, @Req() req: any, @Res() res: Response) {
    // Only allow deleting files from own tenant
    if (req.user?.tenant_id !== tenantId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    try {
      await minioClient.removeObject(BUCKET, `${tenantId}/${fileName}`);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Échec de la suppression' });
    }
  }
}
