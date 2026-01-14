import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Thumbnail sizes for different use cases
const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },   // For lists, grids
  medium: { width: 400, height: 400 },  // For cards, previews
  large: { width: 800, height: 800 },   // For detail views
};

export async function uploadRoutes(fastify: FastifyInstance) {
  // Upload file to Supabase Storage with thumbnail generation
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireFullMode],
  }, async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();
      const fileExt = data.filename.split('.').pop()?.toLowerCase() || 'jpg';
      const baseName = `${Math.random().toString(36).substring(2)}-${Date.now()}`;
      
      // Check if it's an image that can be processed
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt);
      
      let mainUrl = '';
      let thumbnailUrls: { small?: string; medium?: string; large?: string } = {};
      
      if (isImage && data.mimetype.startsWith('image/')) {
        try {
          // Convert to WebP for better compression (30-50% smaller)
          const webpBuffer = await sharp(buffer)
            .webp({ quality: 85 })
            .toBuffer();
          
          const mainFileName = `${baseName}.webp`;
          
          // Upload main image (optimized WebP)
          const { data: mainData, error: mainError } = await supabase.storage
            .from('memory-photos')
            .upload(mainFileName, webpBuffer, {
              contentType: 'image/webp',
              cacheControl: '31536000', // 1 year cache (immutable content)
              upsert: false,
            });

          if (mainError) {
            throw mainError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('memory-photos')
            .getPublicUrl(mainData.path);
          mainUrl = publicUrl;

          // Generate and upload thumbnails in parallel
          const thumbnailPromises = Object.entries(THUMBNAIL_SIZES).map(async ([size, dimensions]) => {
            const thumbBuffer = await sharp(buffer)
              .resize(dimensions.width, dimensions.height, {
                fit: 'cover',
                position: 'center',
              })
              .webp({ quality: 75 })
              .toBuffer();

            const thumbFileName = `thumbs/${baseName}-${size}.webp`;
            
            const { data: thumbData, error: thumbError } = await supabase.storage
              .from('memory-photos')
              .upload(thumbFileName, thumbBuffer, {
                contentType: 'image/webp',
                cacheControl: '31536000',
                upsert: false,
              });

            if (thumbError) {
              fastify.log.warn({ error: thumbError, size }, 'Thumbnail upload failed');
              return null;
            }

            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from('memory-photos')
              .getPublicUrl(thumbData.path);

            return { size, url: thumbUrl };
          });

          const thumbResults = await Promise.all(thumbnailPromises);
          thumbResults.forEach(result => {
            if (result) {
              thumbnailUrls[result.size as keyof typeof thumbnailUrls] = result.url;
            }
          });

        } catch (sharpError) {
          fastify.log.warn({ error: sharpError }, 'Sharp processing failed, uploading original');
          
          // Fallback: upload original if sharp fails
          const { data: uploadData, error } = await supabase.storage
            .from('memory-photos')
            .upload(`${baseName}.${fileExt}`, buffer, {
              contentType: data.mimetype,
              cacheControl: '3600',
              upsert: false,
            });

          if (error) {
            throw error;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('memory-photos')
            .getPublicUrl(uploadData.path);
          mainUrl = publicUrl;
        }
      } else {
        // Non-image file (audio, etc.) - upload as-is
        const filePath = `${baseName}.${fileExt}`;
        
        const { data: uploadData, error } = await supabase.storage
          .from('memory-photos')
          .upload(filePath, buffer, {
            contentType: data.mimetype,
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          fastify.log.error({ error }, 'Upload error');
          return reply.code(500).send({ error: `Upload failed: ${error.message}` });
        }

        const { data: { publicUrl } } = supabase.storage
          .from('memory-photos')
          .getPublicUrl(uploadData.path);
        mainUrl = publicUrl;
      }

      return reply.send({ 
        url: mainUrl,
        thumbnails: thumbnailUrls,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Upload error');
      return reply.code(500).send({ error: 'Upload failed' });
    }
  });
}
