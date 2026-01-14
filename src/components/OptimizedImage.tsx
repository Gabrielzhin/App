import React, { useState, useMemo } from 'react';
import {
  Image,
  ImageProps,
  View,
  StyleSheet,
  ActivityIndicator,
  ImageStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import type { Theme } from '../theme';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  /**
   * Size hint for selecting appropriate thumbnail
   * - 'small': < 150px (lists, avatars)
   * - 'medium': 150-400px (cards, previews)  
   * - 'large': > 400px (detail views)
   * - 'full': Original image
   */
  sizeHint?: 'small' | 'medium' | 'large' | 'full';
  /**
   * Show loading indicator while image loads
   */
  showLoadingIndicator?: boolean;
  /**
   * Fallback URI if main image fails
   */
  fallbackUri?: string;
  /**
   * Style for the image
   */
  imageStyle?: StyleProp<ImageStyle>;
}

/**
 * Optimized image component that:
 * - Automatically selects appropriate thumbnail size
 * - Shows loading indicator
 * - Handles errors with fallback
 * - Progressive loading (thumbnail → full)
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  thumbnails,
  sizeHint = 'medium',
  showLoadingIndicator = true,
  fallbackUri,
  imageStyle,
  style,
  ...imageProps
}) => {
  const theme = useTheme<Theme>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadedThumbnail, setLoadedThumbnail] = useState(false);

  // Select the best image source based on size hint and available thumbnails
  const sources = useMemo(() => {
    const result: { thumbnail?: string; full: string } = { full: uri };

    if (thumbnails) {
      switch (sizeHint) {
        case 'small':
          result.full = thumbnails.small || thumbnails.medium || uri;
          break;
        case 'medium':
          result.thumbnail = thumbnails.small;
          result.full = thumbnails.medium || thumbnails.large || uri;
          break;
        case 'large':
          result.thumbnail = thumbnails.medium || thumbnails.small;
          result.full = thumbnails.large || uri;
          break;
        case 'full':
        default:
          result.thumbnail = thumbnails.medium || thumbnails.small;
          result.full = uri;
          break;
      }
    }

    return result;
  }, [uri, thumbnails, sizeHint]);

  const currentUri = hasError && fallbackUri
    ? fallbackUri
    : (!loadedThumbnail && sources.thumbnail)
      ? sources.thumbnail
      : sources.full;

  const handleLoad = () => {
    if (!loadedThumbnail && sources.thumbnail) {
      // Thumbnail loaded, now load full image
      setLoadedThumbnail(true);
    } else {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    if (!loadedThumbnail && sources.thumbnail) {
      // Thumbnail failed, try full image
      setLoadedThumbnail(true);
    } else if (fallbackUri && currentUri !== fallbackUri) {
      setHasError(true);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        {...imageProps}
        source={{ uri: currentUri }}
        style={[styles.image, imageStyle]}
        onLoad={handleLoad}
        onError={handleError}
        // Enable progressive loading on iOS
        progressiveRenderingEnabled
        // Fade in on load
        fadeDuration={200}
      />
      
      {showLoadingIndicator && isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
          />
        </View>
      )}

      {/* Progressive loading: show blurred thumbnail behind full image */}
      {!loadedThumbnail && sources.thumbnail && (
        <Image
          source={{ uri: sources.full }}
          style={[styles.image, styles.hiddenLoader, imageStyle]}
          onLoad={handleLoad}
          onError={() => {}} // Ignore errors on preload
        />
      )}
    </View>
  );
};

/**
 * Get the appropriate thumbnail URL based on display size
 */
export function getThumbnailUrl(
  originalUrl: string,
  thumbnails?: { small?: string; medium?: string; large?: string },
  sizeHint: 'small' | 'medium' | 'large' | 'full' = 'medium'
): string {
  if (!thumbnails) return originalUrl;

  switch (sizeHint) {
    case 'small':
      return thumbnails.small || thumbnails.medium || originalUrl;
    case 'medium':
      return thumbnails.medium || thumbnails.large || originalUrl;
    case 'large':
      return thumbnails.large || originalUrl;
    case 'full':
    default:
      return originalUrl;
  }
}

/**
 * Parse photo data that may include thumbnail info
 * Supports both string URLs and {url, thumbnails} objects
 */
export function parsePhotoData(photo: string | { url: string; thumbnails?: Record<string, string> }): {
  uri: string;
  thumbnails?: { small?: string; medium?: string; large?: string };
} {
  if (typeof photo === 'string') {
    return { uri: photo };
  }
  return {
    uri: photo.url,
    thumbnails: photo.thumbnails,
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  hiddenLoader: {
    position: 'absolute',
    opacity: 0,
  },
});

export default OptimizedImage;
