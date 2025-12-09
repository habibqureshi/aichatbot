import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Conversation } from "@/app/actions/conversations";

type Props = {
  conversation: Conversation | null | undefined;
  audioSrc: string | null;
  isPlaying: boolean;
  isStreaming: boolean;
  handlePlayRecording: () => void;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
};

const CallRecordingTab: React.FC<Props> = ({
  conversation,
  audioSrc,
  isPlaying,
  isStreaming,
  handlePlayRecording,
  setIsPlaying,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMeta = () => setDuration(audio.duration || 0);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
    };
  }, [audioSrc]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const formatSeconds = (s: number) => {
    if (!s || Number.isNaN(s)) return "0:00";
    const minutes = Math.floor(s / 60);
    const seconds = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const togglePlay = async () => {
    if (!audioSrc) {
      // Request the audio stream, then try to play once src is available
      await handlePlayRecording();
      setTimeout(async () => {
        try {
          if (audioRef.current) {
            await audioRef.current.play();
            setIsPlaying(true);
          }
        } catch {
          // ignore play errors
        }
      }, 150);
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Play error", err);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
  };
  return (
    <div className="space-y-4">
      <div>
        <div className="bg-[#F7F1FF70]  p-6 rounded-[16px]">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-[45px] h-[45px] rounded-[8px] flex items-center justify-center"
              style={{
                background: "#6325A9",
                paddingTop: "4px",
                paddingRight: "6px",
                paddingBottom: "4px",
                paddingLeft: "6px",
              }}
            >
              <Image src="/assets/calls/Microphone.png" alt="Microphone" width={24} height={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Audio Recording</div>
              <div className="text-xs text-gray-500">High quality call recording</div>
            </div>
          </div>

          {!audioSrc ? (
            <button
              onClick={handlePlayRecording}
              disabled={isStreaming || !conversation?.id}
              className={`btn-primary-gradient w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                isStreaming || !conversation?.id ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {isStreaming ? "Loading..." : "Play Recording"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg p-6 ">
                <div className="flex flex-col items-center gap-6 w-full">
                  {/* Waveform */}
                  <div className="flex-1 relative flex justify-center w-full">
                    <div className="w-full h-[175px] rounded-[30px] bg-white p-6 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center px-6">
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-[3px] h-[80px]">
                          {[
                            { height: 70, delay: "0s" },
                            { height: 50, delay: "0.30s" },
                            { height: 70, delay: "0.50s" },
                            { height: 30, delay: "0.80s" },
                            { height: 30, delay: "1.10s" },
                            { height: 10, delay: "1.40s" },
                            { height: 10, delay: "1.70s" },
                            { height: 55, delay: "2.00s" },
                            { height: 65, delay: "2.30s" },
                            { height: 90, delay: "2.60s" },
                            { height: 10, delay: "2.90s" },
                            { height: 20, delay: "3.20s" },
                            { height: 30, delay: "3.50s" },
                            { height: 40, delay: "3.80s" },
                            { height: 90, delay: "4.10s" },
                            { height: 20, delay: "4.40s" },
                            { height: 40, delay: "4.70s" },
                            { height: 30, delay: "5.0s" },
                            { height: 20, delay: "5.30s" },
                            { height: 10, delay: "5.60s" },
                          ].map((bar, i) => {
                            const progress = duration > 0 ? currentTime / duration : 0;
                            const barIndex = i / 20;
                            const isFilled = barIndex <= progress;
                            return (
                              <div
                                key={i}
                                className={`w-[6px] rounded-sm origin-bottom transition-colors duration-200 ${
                                  isFilled ? "bg-[#6325A9]" : "bg-gray-300"
                                }`}
                                style={{
                                  height: `${bar.height}px`,
                                }}
                              ></div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress and times */}
                  <div className="flex items-center gap-4 w-full ">
                    <div className="text-xs text-gray-500">{formatSeconds(currentTime)}</div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, duration)}
                      value={Math.max(0, currentTime)}
                      onChange={handleSeek}
                      className="h-1 accent-[#6325A9] w-full"
                    />
                    <div className="text-xs text-gray-500">{formatSeconds(duration)}</div>
                  </div>

                  <div className="w-full flex items-center justify-between ">
                    {/* Controls - left */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (!audioRef.current) return;
                          audioRef.current.currentTime = Math.max(
                            0,
                            (audioRef.current.currentTime || 0) - 10
                          );
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center border"
                        style={{ borderColor: "#E6E7EB" }}
                        title="Rewind 10s"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <path d="M11 19V5l-9 7 9 7zM22 19V5l-9 7 9 7z" fill="#4C5564" />
                        </svg>
                      </button>

                      <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-[#6325A9] text-white shadow"
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="#fff" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M8 5v14l11-7z" fill="#fff" />
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (!audioRef.current) return;
                          audioRef.current.currentTime = Math.min(
                            audioRef.current.duration || 0,
                            (audioRef.current.currentTime || 0) + 10
                          );
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center border"
                        style={{ borderColor: "#E6E7EB" }}
                        title="Forward 10s"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <path d="M13 5v14l9-7-9-7zM2 5v14l9-7L2 5z" fill="#4C5564" />
                        </svg>
                      </button>
                    </div>

                    {/* Right controls - volume and download */}
                    <div className="flex  items-center gap-3 ">
                      <div className="flex items-center gap-2">
                        <Image
                          src="/assets/calls/SpeakerHigh.svg"
                          alt="Download"
                          width={21}
                          height={21}
                        />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={volume}
                          onChange={handleVolumeChange}
                          className="h-1 w-[120px] accent-[#6325A9]"
                        />
                        <div className="w-8 text-xs text-gray-600">{Math.round(volume * 100)}%</div>
                      </div>
                      <div className=" flex justify-end">
                        <button
                          onClick={() => {
                            if (!audioSrc) return;
                            const link = document.createElement("a");
                            link.href = audioSrc;
                            link.download = `call-recording-${conversation?.id}.mp3`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="p-1 rounded-md hover:bg-gray-100 transition"
                        >
                          <Image
                            src="/assets/calls/download.svg"
                            alt="Download"
                            width={40}
                            height={40}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hidden audio element for managing playback */}
                <audio
                  ref={audioRef}
                  src={audioSrc || undefined}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                  preload="auto"
                />
              </div>
            </div>
          )}
        </div>
        {audioSrc && (
          <div className="grid grid-cols-3 gap-4 text-center mt-4 pt-4">
            <div className="w-full h-[113px] bg-[#F9FAFB] border border-[#E6E7EB] rounded-lg p-4 shadow-[0_2px_2px_0_rgba(35,39,46,0.08)]">
              <div className="text-[#4C5564] font-medium text-base leading-[132%] tracking-normal mb-2">
                Audio Quality
              </div>
              <div className="text-[#23272E] font-medium text-lg leading-[132%] tracking-normal">
                High Definition
              </div>
              <div className="text-[#6B7281] font-medium text-sm leading-[132%] tracking-normal">
                48kHz / 320kbps
              </div>
            </div>
            <div className="w-full h-[113px] bg-[#F9FAFB] border border-[#E6E7EB] rounded-lg p-4 shadow-[0_2px_2px_0_rgba(35,39,46,0.08)]">
              <div className="text-[#4C5564] font-medium text-base leading-[132%] tracking-normal mb-2">
                File Format
              </div>
              <div className="text-[#23272E] font-medium text-lg leading-[132%] tracking-normal">
                MP3
              </div>
              <div className="text-[#6B7281] font-medium text-sm leading-[132%] tracking-normal">
                Compressed audio
              </div>
            </div>
            <div className="w-full h-[113px] bg-[#F9FAFB] border border-[#E6E7EB] rounded-lg p-4 shadow-[0_2px_2px_0_rgba(35,39,46,0.08)]">
              <div className="text-[#4C5564] font-medium text-base leading-[132%] tracking-normal mb-2">
                File Size
              </div>
              <div className="text-[#23272E] font-medium text-lg leading-[132%] tracking-normal">
                2.4 MB
              </div>
              <div className="text-[#6B7281] font-medium text-sm leading-[132%] tracking-normal">
                Estimated size
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallRecordingTab;
