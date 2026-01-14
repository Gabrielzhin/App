import { api } from './api';
import * as ImageManipulator from 'expo-image-manipulator';

export interface UploadResponse {
  url: string;
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
}

// Image compression settings for different use cases
const COMPRESSION_SETTINGS = {
  standard: {
    maxWidth: 1920,
    maxHeight: 1920,
    compress: 0.8,
  },
  high: {
    maxWidth: 2560,
    maxHeight: 2560,
    compress: 0.9,
  },
  low: {
    maxWidth: 1280,
    maxHeight: 1280,
    compress: 0.7,
  },
};

export const uploadService = {
  /**
   * Compress an image on the client before upload
   * This reduces bandwidth usage by 50-80%
   */
  async compressImage(
    uri: string,
    quality: 'standard' | 'high' | 'low' = 'standard'
  ): Promise<string> {
    const settings = COMPRESSION_SETTINGS[quality];
    
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: settings.maxWidth,
              height: settings.maxHeight,
            },
          },
        ],
        {
          compress: settings.compress,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      return result.uri;
    } catch (error) {
      // If compression fails, return original URI
      console.warn('Image compression failed, using original:', error);
      return uri;
    }
  },

  async uploadPhoto(
    uri: string,
    fileName?: string,
    options?: {
      skipCompression?: boolean;
      quality?: 'standard' | 'high' | 'low';
    }
  ): Promise<UploadResponse> {
    const client = api.getRawClient();
    
    // Compress image unless explicitly skipped (e.g., for audio files)
    let processedUri = uri;
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(uri) || 
                    !uri.includes('.');  // Camera images often have no extension
    
    if (isImage && !options?.skipCompression) {
      processedUri = await this.compressImage(uri, options?.quality || 'standard');
    }
    
    // Create form data
    const formData = new FormData();

    // Determine file name and type
    const name = fileName || processedUri.split('/').pop() || 'photo.jpg';
    const type = name.endsWith('.png') ? 'image/png' : 'image/jpeg';

    // @ts-ignore - React Native FormData accepts this format
    formData.append('file', {
      uri: processedUri,
      name,
      type,
    });

    const response = await client.post<UploadResponse>('/api/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  async uploadMultiplePhotos(
    uris: string[],
    options?: {
      quality?: 'standard' | 'high' | 'low';
    }
  ): Promise<UploadResponse[]> {
    // Process images in parallel batches of 3 to avoid memory issues
    const batchSize = 3;
    const results: UploadResponse[] = [];
    
    for (let i = 0; i < uris.length; i += batchSize) {
      const batch = uris.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((uri) => this.uploadPhoto(uri, undefined, options))
      );
      results.push(...batchResults);
    }
    
    return results;
  },

  /**
   * Upload audio file (skips image compression)
   */
  async uploadAudio(uri: string, fileName?: string): Promise<UploadResponse> {
    return this.uploadPhoto(uri, fileName || 'audio.m4a', { skipCompression: true });
  },

  async deletePhoto(path: string): Promise<void> {
    return api.delete('/api/uploads', { data: { path } });
  },
};
