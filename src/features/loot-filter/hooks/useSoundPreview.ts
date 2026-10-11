import { useEffect, useRef, useState } from 'react';

interface Playing {
  readonly audio: HTMLAudioElement;
  readonly owner: object;
  readonly onStop: () => void;
}

// One preview plays at a time across the page: starting another stops this one.
let current: Playing | null = null;

function setCurrent(entry: Playing): void {
  current = entry;
}

function isCurrent(entry: Playing): boolean {
  return current === entry;
}

function stopCurrent(): void {
  if (!current) return;
  const { audio, onStop } = current;
  current = null;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  onStop();
}

export interface SoundPreview {
  /** The URL this hook is playing, or null. */
  readonly playing: string | null;
  /** Why the last play failed (unsupported file, blocked autoplay…), or null. */
  readonly error: string | null;
  /** Plays `url` at `volume` (0 to 100, clamped); stops whatever preview was playing. */
  readonly play: (url: string, volume: number) => void;
  readonly stop: () => void;
}

/** Plays sound previews through one `Audio` element at a time; stops on unmount. */
export function useSoundPreview(): SoundPreview {
  const owner = useRef({});
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const self = owner.current;
    return () => {
      if (current?.owner === self) stopCurrent();
    };
  }, []);

  const stop = () => {
    if (current?.owner === owner.current) stopCurrent();
    setPlaying(null);
  };

  const play = (url: string, volume: number) => {
    stopCurrent();
    setError(null);
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, volume / 100));
    const entry: Playing = {
      audio,
      owner: owner.current,
      onStop: () => {
        setPlaying(null);
      },
    };
    setCurrent(entry);
    audio.addEventListener('ended', () => {
      if (isCurrent(entry)) stopCurrent();
    });
    setPlaying(url);
    audio.play().catch((reason: unknown) => {
      if (!isCurrent(entry)) return;
      stopCurrent();
      setError(reason instanceof Error ? reason.message : 'The sound could not be played');
    });
  };

  return { playing, error, play, stop };
}
