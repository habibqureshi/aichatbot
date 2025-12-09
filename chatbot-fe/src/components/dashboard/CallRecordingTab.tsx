import React from "react";
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
  return (
    <div className="space-y-4">
      <div className="rounded-lg p-6 border" style={{ background: "#FFFFFF", borderColor: "#D5D9E2" }}>
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: "#6366F1" }}
          >
            <Image src="/assets/images/audioIcon.svg" alt="Audio" width={24} height={24} />
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
            <audio
              controls
              autoPlay={isPlaying}
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={(e) => {
                console.error("Audio playback error:", e);
                setIsPlaying(false);
              }}
            >
              <source src={audioSrc} type="audio/mpeg" />
              <source src={audioSrc} type="audio/mp3" />
              <source src={audioSrc} type="audio/wav" />
              <source src={audioSrc} type="audio/ogg" />
              Your browser does not support the audio element.
            </audio>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <div className="text-gray-500 mb-1">Audio Quality</div>
                <div className="font-medium">High Definition</div>
                <div className="text-gray-400">48kHz / 320kbps</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">File Format</div>
                <div className="font-medium">MP3</div>
                <div className="text-gray-400">Compressed audio</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">File Size</div>
                <div className="font-medium">2.4 MB</div>
                <div className="text-gray-400">Estimated size</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = audioSrc;
                  link.download = `call-recording-${conversation?.id}.mp3`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border"
                style={{ borderColor: "#D5D9E2" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallRecordingTab;
