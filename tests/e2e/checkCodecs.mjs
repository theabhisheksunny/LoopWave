import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function test() {
  const app = await electron.launch({
    executablePath: path.join(rootDir, 'node_modules/electron/dist/electron.exe'),
    args: [path.join(rootDir, 'dist/main/index.js')]
  });
  const page = await app.firstWindow();

  const support = await page.evaluate(() => {
    const v = document.createElement('video');
    return {
      mp4: v.canPlayType('video/mp4'),
      mp4Avc: v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
      webm: v.canPlayType('video/webm; codecs="vp8, vorbis"'),
      webmVp9: v.canPlayType('video/webm; codecs="vp9"'),
      ogg: v.canPlayType('video/ogg; codecs="theora"'),
      audioMp3: v.canPlayType('audio/mpeg'),
      audioWav: v.canPlayType('audio/wav')
    };
  });
  console.log('Codec support in Electron:', support);

  // Now test loading a real WebM and MP3
  const testWebm = await page.evaluate(async () => {
    const v = document.createElement('video');
    v.src = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm';
    return new Promise((resolve) => {
      v.onloadedmetadata = () => resolve({ ok: true, duration: v.duration });
      v.onerror = (e) => resolve({ ok: false, error: v.error?.code, msg: v.error?.message });
      setTimeout(() => resolve({ ok: false, error: 'timeout' }), 6000);
    });
  });
  console.log('Test MDN WebM:', testWebm);

  // Test loading a real MP3
  const testMp3 = await page.evaluate(async () => {
    const a = document.createElement('audio');
    a.src = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';
    return new Promise((resolve) => {
      a.onloadedmetadata = () => resolve({ ok: true, duration: a.duration });
      a.onerror = (e) => resolve({ ok: false, error: a.error?.code, msg: a.error?.message });
      setTimeout(() => resolve({ ok: false, error: 'timeout' }), 6000);
    });
  });
  console.log('Test MDN MP3:', testMp3);

  // Test BigBuckBunny.mp4 with detailed error
  const testBbb = await page.evaluate(async () => {
    const v = document.createElement('video');
    v.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    return new Promise((resolve) => {
      v.onloadedmetadata = () => resolve({ ok: true, duration: v.duration });
      v.onerror = (e) => resolve({ ok: false, code: v.error?.code, msg: v.error?.message });
      setTimeout(() => resolve({ ok: false, error: 'timeout' }), 6000);
    });
  });
  console.log('Test BigBuckBunny MP4:', testBbb);

  await app.close();
}

test().catch(console.error);
