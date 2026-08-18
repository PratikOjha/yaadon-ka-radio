"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { track as analyticsTrack } from "@vercel/analytics";
import { tracks, type Track } from "./music";

type YouTubePlayer = {
  loadVideoById: (options: { videoId: string }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

type YouTubeEvent = { data: number; target: YouTubePlayer };
type YouTubePlayerCtor = new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;

declare global {
  interface Window {
    YT?: { Player: YouTubePlayerCtor; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const BATCHES = {
  morning: {
    label: "Morning Batch",
    time: "7am – 12pm",
    description:
      "पहली घंटी, आधी नींद और दोस्तों के साथ शुरू होती एक और खूबसूरत सुबह।"
  },

  afternoon: {
    label: "Afternoon Batch",
    time: "3pm – 6pm",
    description:
      "दोपहर की धीमी क्लास, खिड़की से आती धूप और आख़िरी घंटी का इंतज़ार।",
  },

  evening: {
    label: "कैंटीन वाली शाम",
    time: "6pm – 12am",
    description:
      "एक कप चाय, कुछ अधूरी बातें और शाम का अपना ही संगीत।",
  },
} as const;

function getIndiaHour() {
  const hour = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  return Number(hour.find((part) => part.type === "hour")?.value ?? 0);
}

function getCurrentBatch(): keyof typeof BATCHES {
  const hour = new Date().getHours();

  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 15 && hour < 18) return "afternoon";

  return "evening";
}

export default function PlayerShell() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [duration, setDuration] = useState(tracks[0]?.duration ?? 0);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const apiReadyRef = useRef(false);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
  const currentTrack = tracks[trackIndex];
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const progressTimerRef = useRef<number | null>(null);
  const currentBatch = BATCHES[getCurrentBatch()];

  const stopProgress = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    progressTimerRef.current = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const now = player.getCurrentTime?.() ?? 0;
      const total = player.getDuration?.() ?? duration;
      setCurrentSeconds(now);
      if (total > 0) setDuration(total);
    }, 400);
  }, [duration, stopProgress]);

  const reportError = useCallback((code: number, videoId: string) => {
    window.dispatchEvent(new CustomEvent("nostalgia:youtube-error", { detail: { code, videoId } }));
    analyticsTrack("youtube_playback_error", { code: String(code), videoId });
  }, []);

  const nextTrack = useCallback(() => {
    setTrackIndex((index) => (index + 1) % tracks.length);
  }, [tracks.length]);

  const loadTrack = useCallback((track: Track, autoplay = false) => {
    const player = playerRef.current;
    if (!player) return;
    setCurrentSeconds(0);
    setDuration(track.duration || 0);
    setIsPlaying(false);
    if (!track.videoId) {
      player.stopVideo();
      return;
    }
    player.loadVideoById({ videoId: track.videoId });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onReady = () => { apiReadyRef.current = true; };
    if (window.YT?.Player) {
      onReady();
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      onReady();
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-youtube-iframe-api]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.youtubeIframeApi = "true";
      document.body.appendChild(script);
    }
    return () => { window.onYouTubeIframeAPIReady = previous; };
  }, []);

  useEffect(() => {
  let cancelled = false;

  const createPlayer = () => {
    if (
      cancelled ||
      !playerHostRef.current ||
      !window.YT?.Player ||
      playerRef.current
    ) {
      return;
    }

    playerRef.current = new window.YT.Player(playerHostRef.current, {
      videoId: currentTrack.videoId || undefined,
      width: "100%",
      height: "100%",

      playerVars: {
        autoplay: 0,
        controls: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },

      events: {
        onReady: (event: YouTubeEvent) => {
          const total = event.target.getDuration?.() ?? 0;

          if (total > 0) {
            setDuration(total);
          }
        },

        onStateChange: (event: YouTubeEvent) => {
          const state = event.data;

          if (state === window.YT?.PlayerState.PLAYING) {
            setIsPlaying(true);
            startProgress();
          }

          if (state === window.YT?.PlayerState.PAUSED) {
            setIsPlaying(false);
            stopProgress();
          }

          if (state === window.YT?.PlayerState.ENDED) {
            setIsPlaying(false);
            stopProgress();

            setTrackIndex(
              (index) => (index + 1) % tracksRef.current.length
            );
          }
        },

        onError: (event: YouTubeEvent) => {
          reportError(event.data, currentTrack.videoId);
          stopProgress();

          setTrackIndex(
            (index) => (index + 1) % tracksRef.current.length
          );
        },
      },
    });
  };

  if (window.YT?.Player) {
    apiReadyRef.current = true;
    createPlayer();
    return;
  }

  const interval = window.setInterval(() => {
    if (window.YT?.Player) {
      apiReadyRef.current = true;
      window.clearInterval(interval);
      createPlayer();
    }
  }, 50);

  return () => {
    cancelled = true;
    window.clearInterval(interval);
    stopProgress();

    playerRef.current?.destroy?.();
    playerRef.current = null;
  };
}, [isMobile]);

  useEffect(() => {
    if (!playerRef.current) return;
    loadTrack(currentTrack);
  }, [currentTrack, loadTrack]);

  useEffect(() => () => stopProgress(), [stopProgress]);

  const togglePlayback = () => {
    const player = playerRef.current;

    if (!player || !currentTrack.videoId) {
      return;
    }

    const state = player.getPlayerState?.();

    if (state === window.YT?.PlayerState.PLAYING) {
      player.pauseVideo();
      return;
    }

    player.playVideo();
  };

  const goPrevious = () => {
    const player = playerRef.current;
    if (player && (player.getCurrentTime?.() ?? 0) > 4) {
      player.seekTo(0, true);
      return;
    }
    setTrackIndex((index) => (index - 1 + tracks.length) % tracks.length);
  };

  const goNext = () => {
    if (playerRef.current) playerRef.current.stopVideo();
    nextTrack();
  };

  const seek = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!duration || !playerRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    playerRef.current.seekTo(ratio * duration, true);
    setCurrentSeconds(ratio * duration);
  };

  const progress = duration ? Math.min(100, (currentSeconds / duration) * 100) : 0;
  const displayDuration = duration || currentTrack.duration;

  return (
    <>
      <div className="fixed safe-bottom left-1/2 z-20 hidden w-[min(92vw,42rem)] max-w-xl -translate-x-1/2 sm:block">
      <div className="mb-4 text-center"> <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/60"> {currentBatch.time} </p> <h2 className="mt-1 text-xl font-semibold text-white"> {currentBatch.label} </h2> <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-white/60"> {currentBatch.description} </p> </div>
        <DesktopPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          progress={progress}
          elapsed={currentSeconds}
          duration={displayDuration}
          playerHostRef={isMobile ? null : playerHostRef}
          onSeek={seek}
          onPrevious={goPrevious}
          onToggle={togglePlayback}
          onNext={goNext}
        />
      </div>

      <div className="fixed safe-bottom safe-left safe-right z-20 sm:hidden">
        <MobilePlayer
          track={currentTrack}
          isPlaying={isPlaying}
          progress={progress}
          elapsed={currentSeconds}
          duration={displayDuration}
          playerHostRef={isMobile ? playerHostRef : null}
          onSeek={seek}
          onPrevious={goPrevious}
          onToggle={togglePlayback}
          onNext={goNext}
        />
      </div>
    </>
  );
}

type PlayerProps = {
  track: Track;
  isPlaying: boolean;
  progress: number;
  elapsed: number;
  duration: number;
  playerHostRef: RefObject<HTMLDivElement | null> | null;
  onSeek: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPrevious: () => void;
  onToggle: () => void;
  onNext: () => void;
};

function Glass({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-white/10 bg-gradient-to-b from-white/[0.15] to-white/[0.055] backdrop-blur-3xl backdrop-saturate-[1.7] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] ${className}`}>{children}</div>;
}

function Vinyl({ playerHostRef, isPlaying, mobile = false }: Pick<PlayerProps, "playerHostRef" | "isPlaying"> & { mobile?: boolean }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/15 ${mobile ? "h-16 w-16" : "h-20 w-20"} ${isPlaying ? "vinyl-spin" : ""}`} style={{ animationPlayState: isPlaying ? "running" : "paused" }}>
      <div className="youtube-art absolute inset-0">
        {playerHostRef && <div ref={playerHostRef} className="h-full w-full" />}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 ring-2 ring-white/40 shadow-[0_0_0_1px_rgba(0,0,0,.4)]" />
    </div>
  );
}

function TrackMeta({ track }: { track: Track }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[15px] font-semibold tracking-tight text-white">{track.title}</div>
      <div className="mt-0.5 truncate text-[12.5px] text-white/70">{track.artist} · {track.film}</div>
    </div>
  );
}

function SeekBar({ progress, onSeek }: Pick<PlayerProps, "progress" | "onSeek">) {
  return (
    <div className="seek-hit group relative w-full touch-none cursor-pointer" onPointerDown={onSeek} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} tabIndex={0}>
      <div className="seek-rail absolute left-0 right-0 rounded-full bg-white/15" />
      <div className="seek-rail absolute left-0 rounded-full bg-accent shadow-[0_0_10px_rgba(227,173,69,.8)]" style={{ width: `${progress}%` }} />
      <div className="seek-knob absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_rgba(227,173,69,.9)]" style={{ left: `calc(${progress}% - 5px)` }} />
    </div>
  );
}

function Transport({ isPlaying, onPrevious, onToggle, onNext, mobile = false }: Pick<PlayerProps, "isPlaying" | "onPrevious" | "onToggle" | "onNext"> & { mobile?: boolean }) {
  return (
    <div className={`flex items-center ${mobile ? "gap-1" : "gap-1.5"}`}>
      <button type="button" aria-label="Previous track" onClick={onPrevious} className="grid h-11 w-11 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white active:scale-95">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 5v14M18 6l-9 6 9 6V6Z"/></svg>
      </button>
      <button type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={onToggle} className={`${mobile ? "h-[52px] w-[52px]" : "h-12 w-12"} grid place-items-center rounded-full bg-gradient-to-b from-accent-soft to-accent text-deep ring-1 ring-white/25 drop-shadow-[0_5px_15px_rgba(227,173,69,.45)] transition hover:brightness-110 active:scale-95`}>
        {isPlaying ? <span className="text-[17px]">Ⅱ</span> : <span className="ml-0.5 text-[17px]">▶</span>}
      </button>
      <button type="button" aria-label="Next track" onClick={onNext} className="grid h-11 w-11 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white active:scale-95">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 5v14M6 6l9 6-9 6V6Z"/></svg>
      </button>
    </div>
  );
}

function TimeReadout({ elapsed, duration }: Pick<PlayerProps, "elapsed" | "duration">) {
  return <div className="flex shrink-0 items-center gap-1 text-[10.5px] tabular-nums text-white/55"><span>{formatTime(elapsed)}</span><span>/</span><span>{formatTime(duration)}</span></div>;
}

function DesktopPlayer(props: PlayerProps) {
  return (
    <Glass className="player-enter rounded-full p-3 pr-5">
      <div className="flex items-center gap-4">
        <Vinyl {...props} />

        <div className="min-w-0 flex-1">
          <TrackMeta track={props.track} />

          <div className="mt-2 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SeekBar {...props} />
            </div>

            <TimeReadout {...props} />
          </div>
        </div>

        <Transport {...props} />
      </div>
    </Glass>
  );
}

function MobilePlayer(props: PlayerProps) {
  return (
    <Glass className="player-enter rounded-[26px] p-3.5">
      <div className="flex items-center gap-3">
        <Vinyl {...props} mobile />

        <div className="min-w-0 flex-1">
          <TrackMeta track={props.track} />
        </div>
      </div>

      <div className="mt-4">
        <SeekBar {...props} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <TimeReadout {...props} />

        <Transport {...props} mobile />

        <div className="w-[76px]" />
      </div>
    </Glass>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}
