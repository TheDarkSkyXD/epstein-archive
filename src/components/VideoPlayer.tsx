import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X, Minimize2 } from 'lucide-react';
import { TranscriptSegment, Chapter } from './AudioPlayer'; // Reuse types

interface VideoPlayerProps {
  src: string;
  title: string;
  transcript?: TranscriptSegment[];
  chapters?: Chapter[];
  onClose?: () => void;
  autoPlay?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  transcript = [],
  chapters = [],
  onClose,
  autoPlay = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, _setShowTranscript] = useState(true);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [showChapters, setShowChapters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = playbackRate;
      if (autoPlay) {
        videoRef.current.play().catch((e) => console.warn('Autoplay failed:', e));
      }
    }
  }, [autoPlay]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
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
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const seek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded bg-cyan-900/30 flex items-center justify-center text-cyan-400">
            <Play size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-200 truncate" title={title}>
              {title}
            </h3>
            <p className="text-xs text-slate-500">
              {chapters.length > 0 ? `${chapters.length} chapters` : 'Video Recording'}
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

      <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
        {/* Main Content (Video) */}
        <div
          ref={containerRef}
          className="flex-1 bg-black relative flex items-center justify-center overflow-hidden group"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => {
              setIsPlaying(false);
              setShowControls(true);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              setShowControls(true);
            }}
            onClick={togglePlay}
          />

          {/* Video Controls Overlay */}
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Progress Bar with Chapters */}
            <div className="mb-4 relative group/progress">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:h-2 transition-all"
              />
              {/* Chapter Markers */}
              {chapters.map((chapter, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-0.5 h-1.5 bg-yellow-500 hover:bg-white cursor-pointer z-10 transition-colors"
                  style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                  title={chapter.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    seek(chapter.startTime);
                  }}
                />
              ))}
              <div className="flex justify-between text-xs text-slate-300 font-mono mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-cyan-400 transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={24} fill="currentColor" />
                  ) : (
                    <Play size={24} fill="currentColor" />
                  )}
                </button>

                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (videoRef.current) videoRef.current.muted = !isMuted;
                    }}
                    className="text-slate-300 hover:text-white"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      if (videoRef.current) videoRef.current.volume = parseFloat(e.target.value);
                    }}
                    className="w-0 overflow-hidden group-hover/vol:w-20 transition-all h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="text-sm text-white truncate max-w-[200px]">
                  {/* Current Chapter Display */}
                  {chapters.length > 0 && (
                    <span className="opacity-80">
                      {
                        chapters
                          .slice()
                          .reverse()
                          .find((c) => currentTime >= c.startTime)?.title
                      }
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-white/10 rounded px-1">
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (videoRef.current) videoRef.current.playbackRate = rate;
                      }}
                      className={`px-2 py-0.5 text-xs rounded ${playbackRate === rate ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <button onClick={toggleFullscreen} className="text-slate-300 hover:text-white">
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (Transcript/Chapters) */}
        {(transcript.length > 0 || chapters.length > 0) && (
          <div
            className={`w-80 border-l border-slate-800 bg-slate-900/30 flex flex-col ${showTranscript ? 'block' : 'hidden'} md:block shrink-0`}
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

            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent max-h-[40vh] md:max-h-none">
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
    </div>
  );
};
