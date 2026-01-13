import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  FastForward,
  Maximize2,
  X,
  Settings,
  List,
  Shield,
} from 'lucide-react';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface Chapter {
  startTime: number;
  title: string;
}

interface AudioPlayerProps {
  src: string;
  title: string;
  transcript?: TranscriptSegment[];
  chapters?: Chapter[];
  onClose?: () => void;
  autoPlay?: boolean;
  isSensitive?: boolean;
  warningText?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  transcript = [],
  chapters = [],
  onClose,
  autoPlay = false,
  isSensitive = false,
  warningText = 'This content contains graphic descriptions of violence, sexual assault, child exploitation and murder.',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [showChapters, setShowChapters] = useState(false);

  // Initialize
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = playbackRate;
      if (autoPlay) {
        audioRef.current.play().catch((e) => console.warn('Autoplay failed:', e));
      }
    }
  }, [autoPlay]);

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);

      // Find active segment
      if (transcript.length > 0) {
        const index = transcript.findIndex((seg) => time >= seg.start && time < seg.end);
        if (index !== -1 && index !== activeSegmentIndex) {
          setActiveSegmentIndex(index);
          scrollToSegment(index);
        }
      }
    }
  };

  const scrollToSegment = (index: number) => {
    if (transcriptRef.current) {
      const el = transcriptRef.current.children[index] as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded bg-cyan-900/30 flex items-center justify-center text-cyan-400">
            <Volume2 size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-200 truncate" title={title}>
              {title}
            </h3>
            <p className="text-xs text-slate-500">
              {chapters.length > 0 ? `${chapters.length} chapters` : 'Audio Recording'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Sensitive Content Warning Overlay */}
        {isSensitive && !isPlaying && currentTime === 0 && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-1 ring-red-500/30">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Graphic Content Warning</h3>
            <p className="text-slate-400 max-w-md mb-8 leading-relaxed">{warningText}</p>
            <div className="flex gap-4">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.play().catch(console.error);
                    setIsPlaying(true);
                  }
                }}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg shadow-red-900/20 transition-all hover:scale-105"
              >
                Reveal & Play
              </button>
            </div>
          </div>
        )}

        {/* Main Content (Visuals + Controls) */}
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
          {/* Visualizer Placeholder */}
          <div className="flex-1 min-h-[100px] bg-slate-900/50 rounded-lg border border-slate-800/50 mb-6 flex items-center justify-center relative overflow-hidden group">
            {/* Animated bars simulation */}
            <div className="flex items-end justify-center gap-1 h-1/3 w-full px-10 opacity-30">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 bg-cyan-500/50 rounded-t transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}
                  style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }}
                />
              ))}
            </div>

            {/* Active Chapter Display */}
            {chapters.length > 0 && (
              <div className="absolute top-4 left-4 right-4 text-center">
                <span className="text-xs font-mono text-cyan-500 uppercase tracking-widest">
                  Current Chapter
                </span>
                <h4 className="text-lg text-white font-light">
                  {chapters
                    .slice()
                    .reverse()
                    .find((c) => currentTime >= c.startTime)?.title ||
                    chapters[0]?.title ||
                    'Unknown'}
                </h4>
              </div>
            )}
          </div>

          {/* Progress Bar with Chapters */}
          <div className="mb-4 relative group">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:bg-slate-700 transition-colors"
            />
            {/* Chapter Markers */}
            {chapters.map((chapter, i) => (
              <div
                key={i}
                className="absolute top-0 w-0.5 h-2 bg-slate-500 hover:bg-white cursor-pointer z-10 transition-colors"
                style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                title={chapter.title}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(chapter.startTime);
                }}
              />
            ))}
            <div className="flex justify-between text-xs text-slate-500 font-mono mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => seek(currentTime - 10)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <SkipBack size={24} />
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg shadow-cyan-900/20 transition-all hover:scale-105"
            >
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="ml-1" />
              )}
            </button>

            <button
              onClick={() => seek(currentTime + 10)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <SkipForward size={24} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (audioRef.current) audioRef.current.muted = !isMuted;
                }}
                className="text-slate-400 hover:text-white"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value);
                }}
                className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-800">
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (audioRef.current) audioRef.current.playbackRate = rate;
                  }}
                  className={`px-2 py-1 text-xs rounded ${playbackRate === rate ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar (Transcript/Chapters) */}
        {(transcript.length > 0 || chapters.length > 0) && (
          <div
            className={`w-80 border-l border-slate-800 bg-slate-900/30 flex flex-col ${showTranscript ? 'block' : 'hidden'} md:block`}
          >
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setShowChapters(false)}
                className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${!showChapters ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Transcript
              </button>
              {chapters.length > 0 && (
                <button
                  onClick={() => setShowChapters(true)}
                  className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${showChapters ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Chapters
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {!showChapters ? (
                <div ref={transcriptRef} className="flex flex-col">
                  {transcript.length > 0 ? (
                    transcript.map((seg, i) => (
                      <button
                        key={i}
                        onClick={() => seek(seg.start)}
                        className={`p-4 text-left border-b border-slate-800/50 transition-colors hover:bg-slate-800/50 ${activeSegmentIndex === i ? 'bg-cyan-900/20' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-500">
                            {formatTime(seg.start)}
                          </span>
                          {seg.speaker && (
                            <span className="text-xs font-bold text-slate-300">{seg.speaker}</span>
                          )}
                        </div>
                        <p
                          className={`text-sm leading-relaxed ${activeSegmentIndex === i ? 'text-white' : 'text-slate-400'}`}
                        >
                          {seg.text}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No transcript available.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  {chapters.map((chapter, i) => (
                    <button
                      key={i}
                      onClick={() => seek(chapter.startTime)}
                      className={`p-4 text-left border-b border-slate-800/50 flex items-center gap-3 hover:bg-slate-800/50 group`}
                    >
                      <div className="text-xs font-mono text-slate-500 w-12">
                        {formatTime(chapter.startTime)}
                      </div>
                      <div className="flex-1 text-sm text-slate-300 group-hover:text-cyan-400 transition-colors">
                        {chapter.title}
                      </div>
                      <Play size={12} className="opacity-0 group-hover:opacity-100 text-cyan-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
};
