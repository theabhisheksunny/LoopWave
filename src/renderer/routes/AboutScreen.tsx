import React from 'react';
import {
  Radio,
  CheckCircle,
  ShieldCheck,
  Cpu,
  Layers,
  ExternalLink,
  Info
} from 'lucide-react';
import { AdapterRegistry } from '../adapters/adapterRegistry';

export const AboutScreen: React.FC = () => {
  const adapters = AdapterRegistry.getInstance().getAvailableAdapters();
  const appInfo = window.loopwaveApi?.appInfo || {
    version: '1.0.0',
    platform: 'win32',
    arch: 'x64'
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto">
      {/* Brand Hero */}
      <div className="bg-[#121721] border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">LoopWave</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Privacy-Focused Online Media Player for Windows
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300">
                Version {appInfo.version}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                {appInfo.platform} ({appInfo.arch})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#181F2E] p-3 rounded-xl border border-white/5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Zero external telemetry &bull; Isolated renderer &bull; Strict CSP</span>
        </div>
      </div>

      {/* Supported Playback Engines */}
      <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Active Playback Adapters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {adapters.map((a) => (
            <div
              key={a.id}
              className="p-3.5 rounded-xl bg-[#181F2E]/60 border border-white/5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{a.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  {a.id}
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                {a.id === 'youtube'
                  ? 'Official YouTube IFrame Player integration with origin-sandboxed communication.'
                  : 'HTML5 Video/Audio pipeline with Hls.js hardware-accelerated adaptive bitrate streaming.'}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {a.capabilities.supportsSpeed && (
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-300">
                    Speed Control
                  </span>
                )}
                {a.capabilities.supportsPiP && (
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-300">
                    PiP
                  </span>
                )}
                {a.capabilities.supportsSeeking && (
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-300">
                    Seeking
                  </span>
                )}
                {a.capabilities.supportsVolume && (
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-300">
                    Volume
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Storage Transparency Document */}
      <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-3 text-xs text-slate-300 leading-relaxed">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Info className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Storage & Privacy Transparency</h3>
        </div>

        <p>
          <strong>Application Storage:</strong> LoopWave only stores metadata (link URLs, user titles, favorite flags, and anonymized local playback cycle counts) in an embedded SQLite database. No media files or video streams are ever saved to disk by LoopWave during playback.
        </p>
        <p>
          <strong>Engine & Third-Party Caching:</strong> Underneath the application shell, Chromium, media decoders, and embedded third-party players (such as the official YouTube embedded player) may temporarily buffer chunks in memory or standard web cache files according to standard browser runtime architecture. LoopWave does not claim absolute zero disk writes across third-party subsystems; rather, our own application code enforces strict minimal storage and zero telemetry.
        </p>
        <p>
          <strong>Private Mode:</strong> When enabled, even LoopWave's own metadata is stored exclusively in RAM and discarded when the application is closed.
        </p>
      </div>

      {/* Diagnostics / Tech Stack */}
      <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-3 text-xs">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">System Architecture</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Shell</span>
            <span className="font-medium">Electron (Isolated)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Frontend</span>
            <span className="font-medium">React + TypeScript</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Database</span>
            <span className="font-medium">SQLite (sql.js / WASM)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Streaming</span>
            <span className="font-medium">HTML5 + HLS.js + YT API</span>
          </div>
        </div>
      </div>
    </div>
  );
};
