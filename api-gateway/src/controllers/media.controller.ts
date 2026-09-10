import { Controller, Post, Get, Delete, Param, Req, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../guards/auth.guard';
import { Response } from 'express';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';

// ── Storage Provider: Cloudinary (100% Free, 25 GB, No Credit Card) ───────
const isCloudinary = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ url: process.env.CLOUDINARY_URL });
  console.log('Media storage: using Cloudinary (via CLOUDINARY_URL)');
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log(`Media storage: using Cloudinary (cloud_name: ${process.env.CLOUDINARY_CLOUD_NAME})`);
}

// ── MinIO / S3 Fallback ────────────────────────────────────────────────────
const useSSL = process.env.MINIO_USE_SSL === 'true' || process.env.MINIO_PORT === '443';
const minioPort = parseInt(process.env.MINIO_PORT || (useSSL ? '443' : '9000'), 10);

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: minioPort,
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || 'winaity',
  secretKey: process.env.MINIO_SECRET_KEY || 'winaity123',
});

const BUCKET = process.env.MINIO_BUCKET || 'templates';

async function ensureBucket() {
  if (isCloudinary) return; // Cloudinary automatically creates folders
  if (!process.env.MINIO_ENDPOINT && process.env.NODE_ENV === 'production') return;
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET);
    }
    try {
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
    } catch {
      // Ignored for cloud S3 providers
    }
  } catch (err: any) {
    console.warn('MinIO setup check (non-fatal):', err?.message || err);
  }
}
ensureBucket();

function buildPublicUrl(fileName: string): string {
  if (process.env.MINIO_PUBLIC_URL) {
    return `${process.env.MINIO_PUBLIC_URL.replace(/\/$/, '')}/${BUCKET}/${fileName}`;
  }
  const protocol = useSSL ? 'https' : 'http';
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const portSuffix = (minioPort === 80 || minioPort === 443) ? '' : `:${minioPort}`;
  return `${protocol}://${endpoint}${portSuffix}/${BUCKET}/${fileName}`;
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {

  @Get()
  async list(@Req() req: any, @Res() res: Response) {
    const tenantId = req.user?.tenant_id || 'default';

    try {
      if (isCloudinary) {
        const result = await cloudinary.api.resources({
          type: 'upload',
          prefix: `buildwithus/${tenantId}/`,
          max_results: 100,
        });
        const images = (result.resources || []).map((r: any) => ({
          url: r.secure_url,
          fileName: `${tenantId}/${r.public_id.split('/').pop()}.${r.format}`,
          size: r.bytes || 0,
          lastModified: r.created_at || '',
        }));
        images.sort((a: any, b: any) => (a.lastModified < b.lastModified ? 1 : -1));
        return res.json(images);
      }

      // MinIO fallback
      const prefix = `${tenantId}/`;
      const images: { url: string; fileName: string; size: number; lastModified: string }[] = [];
      await new Promise<void>((resolve, reject) => {
        const stream = minioClient.listObjectsV2(BUCKET, prefix, true);
        stream.on('data', (obj: Minio.BucketItem) => {
          if (!obj.name) return;
          const ext = obj.name.split('.').pop()?.toLowerCase() || '';
          if (!IMAGE_EXTENSIONS.has(ext)) return;
          images.push({
            url: buildPublicUrl(obj.name),
            fileName: obj.name,
            size: obj.size ?? 0,
            lastModified: obj.lastModified ? new Date(obj.lastModified).toISOString() : '',
          });
        });
        stream.on('end', () => resolve());
        stream.on('error', (e) => reject(e));
      });
      images.sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1));
      return res.json(images);
    } catch (err) {
      console.error('List media failed:', err);
      return res.json([]);
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: any, @Req() req: any, @Res() res: Response) {
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const allowedImages    = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const allowedVideos    = ['video/mp4', 'video/webm', 'video/ogg'];
    const allowedDocuments = ['application/pdf'];
    const allowed = [...allowedImages, ...allowedVideos, ...allowedDocuments];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Type de fichier non autorisé. Utilisez JPG, PNG, GIF, WebP, SVG, MP4, WebM, OGG ou PDF.' });
    }

    const isVideo = allowedVideos.includes(file.mimetype);
    const isPdf   = allowedDocuments.includes(file.mimetype);
    const maxSize = isVideo ? 50 * 1024 * 1024 : isPdf ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const limitMb = isVideo ? 50 : isPdf ? 20 : 5;
      return res.status(400).json({ error: `Le fichier ne doit pas dépasser ${limitMb} Mo` });
    }

    try {
      const tenantId = req.user?.tenant_id || 'default';
      const fileId = uuid();
      const ext = file.originalname.split('.').pop() || 'png';
      const fileName = `${tenantId}/${fileId}.${ext}`;

      if (isCloudinary) {
        const resourceType = isVideo ? 'video' : isPdf ? 'raw' : 'image';
        const uploadResult: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: `buildwithus/${tenantId}`,
              public_id: fileId,
              resource_type: resourceType,
            },
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        return res.json({
          url: uploadResult.secure_url,
          fileName,
          size: uploadResult.bytes || file.size,
          type: file.mimetype,
        });
      }

      // MinIO fallback
      await minioClient.putObject(BUCKET, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });

      const url = buildPublicUrl(fileName);

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
      if (isCloudinary) {
        const fileIdWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        const publicId = `buildwithus/${tenantId}/${fileIdWithoutExt}`;
        const url = cloudinary.url(publicId, { secure: true });
        return res.redirect(url);
      }

      const stream = await minioClient.getObject(BUCKET, `${tenantId}/${fileName}`);
      stream.pipe(res);
    } catch {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }
  }

  @Delete(':tenantId/:fileName')
  async deleteFile(@Param('tenantId') tenantId: string, @Param('fileName') fileName: string, @Req() req: any, @Res() res: Response) {
    if (req.user?.tenant_id !== tenantId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    try {
      if (isCloudinary) {
        const fileIdWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        const publicId = `buildwithus/${tenantId}/${fileIdWithoutExt}`;
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true });
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', invalidate: true });
        return res.json({ success: true });
      }

      await minioClient.removeObject(BUCKET, `${tenantId}/${fileName}`);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Échec de la suppression' });
    }
  }
}
