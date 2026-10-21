import { describe, it, expect } from 'vitest';
import { resolveSource } from '../../src/renderer/adapters/sourceResolver';

describe('SourceResolver', () => {
  describe('YouTube URL resolution', () => {
    it('resolves standard youtube.com/watch URLs', () => {
      const res = resolveSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('youtube');
      expect(res.source?.videoId).toBe('dQw4w9WgXcQ');
      expect(res.source?.canonicalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('resolves youtu.be short URLs', () => {
      const res = resolveSource('https://youtu.be/dQw4w9WgXcQ');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('youtube');
      expect(res.source?.videoId).toBe('dQw4w9WgXcQ');
    });

    it('resolves youtube embed URLs', () => {
      const res = resolveSource('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('youtube');
      expect(res.source?.videoId).toBe('dQw4w9WgXcQ');
    });

    it('resolves and normalizes YouTube Shorts URLs to canonical watch URL', () => {
      const res = resolveSource('https://www.youtube.com/shorts/n2YGWiRRxEs');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('youtube');
      expect(res.source?.videoId).toBe('n2YGWiRRxEs');
      expect(res.source?.canonicalUrl).toBe('https://www.youtube.com/watch?v=n2YGWiRRxEs');
    });

    it('resolves YouTube Shorts with query parameters and trailing slashes', () => {
      const res = resolveSource('https://www.youtube.com/shorts/kwXZjR5phcc?feature=share&si=abc123xyz');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('youtube');
      expect(res.source?.videoId).toBe('kwXZjR5phcc');
      expect(res.source?.canonicalUrl).toBe('https://www.youtube.com/watch?v=kwXZjR5phcc');
    });

    it('resolves YouTube Live stream URLs', () => {
      const res = resolveSource('https://www.youtube.com/live/M7lc1UVf-VE');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('youtube');
      expect(res.source?.videoId).toBe('M7lc1UVf-VE');
      expect(res.source?.canonicalUrl).toBe('https://www.youtube.com/watch?v=M7lc1UVf-VE');
    });

    it('resolves music.youtube.com URLs', () => {
      const res = resolveSource('https://music.youtube.com/watch?v=M7lc1UVf-VE');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('youtube');
      expect(res.source?.videoId).toBe('M7lc1UVf-VE');
    });

    it('normalizes all 3 forms of the verification video to the same video ID', () => {
      const shorts = resolveSource('https://www.youtube.com/shorts/n2YGWiRRxEs');
      const watch = resolveSource('https://www.youtube.com/watch?v=n2YGWiRRxEs');
      const youtbe = resolveSource('https://youtu.be/n2YGWiRRxEs');

      expect(shorts.source?.videoId).toBe('n2YGWiRRxEs');
      expect(watch.source?.videoId).toBe('n2YGWiRRxEs');
      expect(youtbe.source?.videoId).toBe('n2YGWiRRxEs');

      expect(shorts.source?.canonicalUrl).toBe('https://www.youtube.com/watch?v=n2YGWiRRxEs');
      expect(watch.source?.canonicalUrl).toBe('https://www.youtube.com/watch?v=n2YGWiRRxEs');
      expect(youtbe.source?.canonicalUrl).toBe('https://www.youtube.com/watch?v=n2YGWiRRxEs');
    });

    it('parses timestamps from youtube URLs', () => {
      const res = resolveSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s');
      expect(res.success).toBe(true);
      expect(res.source?.metadata?.startTime).toBe(90);
    });

    it('rejects youtube URLs with malformed video IDs', () => {
      const res = resolveSource('https://www.youtube.com/watch?v=short');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid or missing YouTube Video ID');
    });
  });

  describe('Direct media URL resolution', () => {
    it('resolves direct MP4 URLs', () => {
      const res = resolveSource('https://example.com/media/sample.mp4');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('direct-video');
      expect(res.source?.mediaType).toBe('video');
      expect(res.source?.videoId).toBeDefined();
    });

    it('resolves direct WebM URLs', () => {
      const res = resolveSource('https://example.com/video.webm');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('direct-video');
    });

    it('resolves HLS .m3u8 stream URLs', () => {
      const res = resolveSource('https://example.com/live/master.m3u8');
      expect(res.success).toBe(true);
      expect(res.source?.sourceType).toBe('hls');
      expect(res.source?.isLive).toBe(true);
    });

    it('resolves direct audio URLs (.mp3, .wav, .flac)', () => {
      const mp3 = resolveSource('https://example.com/audio/track.mp3');
      expect(mp3.success).toBe(true);
      expect(mp3.source?.sourceType).toBe('direct-audio');
      expect(mp3.source?.mediaType).toBe('audio');

      const flac = resolveSource('https://example.com/music.flac');
      expect(flac.success).toBe(true);
      expect(flac.source?.sourceType).toBe('direct-audio');
    });
  });

  describe('Invalid and unsupported URLs', () => {
    it('rejects empty input', () => {
      const res = resolveSource('');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('resolves local media files (file:// URLs and direct file paths)', () => {
      const resFile = resolveSource('file:///C:/video.mp4');
      expect(resFile.success).toBe(true);
      expect(resFile.source?.sourceType).toBe('direct-video');
      expect(resFile.source?.canonicalUrl).toContain('/local-media?path=');

      const resWin = resolveSource('D:\\media\\music.mp3');
      expect(resWin.success).toBe(true);
      expect(resWin.source?.sourceType).toBe('direct-audio');

      const resJs = resolveSource('javascript:alert(1)');
      expect(resJs.success).toBe(false);
    });

    it('rejects unsupported regular webpages', () => {
      const res = resolveSource('https://example.com/article/read-me');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unsupported link format');
    });
  });
});
