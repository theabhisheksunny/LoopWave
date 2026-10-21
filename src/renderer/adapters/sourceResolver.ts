import { ResolvedSource } from '../../shared/types';

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'media_' + Math.abs(hash).toString(36);
}

export interface ResolveResult {
  success: boolean;
  source?: ResolvedSource;
  error?: string;
}

export function resolveSource(inputUrl: string): ResolveResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { success: false, error: 'Please enter a valid URL' };
  }

  const trimmed = inputUrl.trim();

  // Local File Detection (file:// URLs, Windows drive paths like D:\... or C:/..., and absolute paths)
  const isFileProtocol = trimmed.startsWith('file://') || trimmed.startsWith('file:/');
  const isWindowsDrivePath = /^[a-zA-Z]:[\\\/]/.test(trimmed);
  const isUnixAbsolutePath = trimmed.startsWith('/') && !trimmed.startsWith('//');

  if (isFileProtocol || isWindowsDrivePath || isUnixAbsolutePath) {
    let rawPath = trimmed;
    if (isFileProtocol) {
      rawPath = trimmed.replace(/^file:\/\/\/?/, '');
      try {
        rawPath = decodeURIComponent(rawPath);
      } catch {
        // ignore
      }
    }

    const lower = rawPath.toLowerCase();
    const fileName = rawPath.split(/[\\\/]/).pop()?.split('?')[0] || 'Local Media';
    const videoId = hashString(rawPath);

    // Direct streaming endpoint via local loopback server without caching or disk duplication
    const origin =
      typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin
        : 'http://127.0.0.1:0';
    const streamingUrl = `${origin}/local-media?path=${encodeURIComponent(rawPath)}`;

    // HLS Stream (.m3u8)
    if (lower.endsWith('.m3u8')) {
      return {
        success: true,
        source: {
          sourceType: 'hls',
          originalUrl: trimmed,
          canonicalUrl: streamingUrl,
          videoId,
          title: fileName,
          mediaType: 'video',
          isLive: false
        }
      };
    }

    // Direct Video (.mp4, .webm, .ogg, .ogv, .mov, .m4v)
    const videoExts = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v'];
    if (videoExts.some((ext) => lower.endsWith(ext))) {
      return {
        success: true,
        source: {
          sourceType: 'direct-video',
          originalUrl: trimmed,
          canonicalUrl: streamingUrl,
          videoId,
          title: fileName,
          mediaType: 'video'
        }
      };
    }

    // Direct Audio (.mp3, .wav, .aac, .flac, .m4a, .oga)
    const audioExts = ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.oga'];
    if (audioExts.some((ext) => lower.endsWith(ext))) {
      return {
        success: true,
        source: {
          sourceType: 'direct-audio',
          originalUrl: trimmed,
          canonicalUrl: streamingUrl,
          videoId,
          title: fileName,
          mediaType: 'audio'
        }
      };
    }

    return {
      success: false,
      error: 'Unsupported local media format. Supported: .mp4, .webm, .mov, .mp3, .wav, .flac, .m3u8.'
    };
  }

  let urlObj: URL;
  try {
    urlObj = new URL(trimmed);
  } catch {
    return { success: false, error: 'Malformed URL. Ensure it starts with http://, https://, or a valid local file path' };
  }

  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return { success: false, error: 'Only http, https, and local media files are supported' };
  }

  const hostname = urlObj.hostname.toLowerCase();
  const pathname = urlObj.pathname;

  // 1. YouTube Detection
  const isYouTube =
    hostname === 'www.youtube.com' ||
    hostname === 'youtube.com' ||
    hostname === 'm.youtube.com' ||
    hostname === 'music.youtube.com' ||
    hostname === 'youtu.be' ||
    hostname === 'www.youtube-nocookie.com';

  if (isYouTube) {
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = pathname.replace(/^\/+/, '').split('/')[0]?.split('?')[0] || null;
    } else if (pathname.startsWith('/watch')) {
      videoId = urlObj.searchParams.get('v');
    } else if (pathname.startsWith('/embed/')) {
      videoId = pathname.split('/embed/')[1]?.split('/')[0]?.split('?')[0] || null;
    } else if (pathname.startsWith('/shorts/')) {
      videoId = pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0] || null;
    } else if (pathname.startsWith('/live/')) {
      videoId = pathname.split('/live/')[1]?.split('/')[0]?.split('?')[0] || null;
    } else if (pathname.startsWith('/v/')) {
      videoId = pathname.split('/v/')[1]?.split('/')[0]?.split('?')[0] || null;
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{10,12}$/.test(videoId)) {
      return {
        success: false,
        error: 'Invalid or missing YouTube Video ID. Please check the URL.'
      };
    }

    // Parse start time if present (?t=120 or ?start=120 or ?t=1m30s)
    let startTime: number | undefined;
    const tParam = urlObj.searchParams.get('t') || urlObj.searchParams.get('start');
    if (tParam) {
      const match = tParam.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
      if (match) {
        const hours = parseInt(match[1] || '0', 10);
        const mins = parseInt(match[2] || '0', 10);
        const secs = parseInt(match[3] || '0', 10);
        startTime = hours * 3600 + mins * 60 + secs;
      } else if (!isNaN(Number(tParam))) {
        startTime = parseInt(tParam, 10);
      }
    }

    // Always normalize to standard canonical watch URL
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return {
      success: true,
      source: {
        sourceType: 'youtube',
        originalUrl: trimmed,
        canonicalUrl,
        videoId,
        title: `YouTube Video (${videoId})`,
        thumbnailUrl,
        mediaType: 'video',
        metadata: {
          youtubeVideoId: videoId,
          startTime
        }
      }
    };
  }

  // 2. Direct Media Detection (Extensions & Paths)
  const lowerPath = pathname.toLowerCase();

  // HLS Stream (.m3u8)
  if (lowerPath.endsWith('.m3u8')) {
    const videoId = hashString(trimmed);
    const fileName = pathname.split('/').pop()?.split('?')[0] || 'HLS Live Stream';
    return {
      success: true,
      source: {
        sourceType: 'hls',
        originalUrl: trimmed,
        canonicalUrl: trimmed,
        videoId,
        title: decodeURIComponent(fileName),
        mediaType: 'video',
        isLive: true
      }
    };
  }

  // Video (.mp4, .webm, .ogg, .ogv, .mov, .m4v)
  const videoExts = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v'];
  if (videoExts.some((ext) => lowerPath.endsWith(ext))) {
    const videoId = hashString(trimmed);
    const fileName = pathname.split('/').pop()?.split('?')[0] || 'Direct Video';
    return {
      success: true,
      source: {
        sourceType: 'direct-video',
        originalUrl: trimmed,
        canonicalUrl: trimmed,
        videoId,
        title: decodeURIComponent(fileName),
        mediaType: 'video'
      }
    };
  }

  // Audio (.mp3, .wav, .aac, .flac, .m4a, .oga)
  const audioExts = ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.oga'];
  if (audioExts.some((ext) => lowerPath.endsWith(ext))) {
    const videoId = hashString(trimmed);
    const fileName = pathname.split('/').pop()?.split('?')[0] || 'Direct Audio';
    return {
      success: true,
      source: {
        sourceType: 'direct-audio',
        originalUrl: trimmed,
        canonicalUrl: trimmed,
        videoId,
        title: decodeURIComponent(fileName),
        mediaType: 'audio'
      }
    };
  }

  return {
    success: false,
    error:
      'Unsupported link format. LoopWave supports YouTube links, direct media (.mp4, .webm, .mp3, .wav, .flac), and HLS (.m3u8) streams.'
  };
}
