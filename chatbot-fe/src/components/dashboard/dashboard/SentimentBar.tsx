"use client";
import React from "react";
import Image from "next/image";

type Props = {
  positive: number;
  neutral: number;
  negative: number;
  // pixel-perfect overrides
  iconSize?: number; // container size in px (default 44)
  emojiSize?: number; // emoji size in px (default 24)
  // Fill colors for the circle backgrounds
  fillColors?: {
    positive?: string;
    neutral?: string;
    negative?: string;
  };
  // Segment colors for the progress bar
  progressBarColors?: [string, string, string];
};

export default function SentimentBar({
  positive,
  neutral,
  negative,
  iconSize = 44,
  emojiSize = 24,
  fillColors = { positive: "#337F3F", neutral: "#F9A307", negative: "#C61E12" },
  progressBarColors = ["#984AF8", "#E34998", "#4318FF"],
}: Props) {
  const total = positive + neutral + negative || 1;
  const pPct = Math.round((positive / total) * 100);
  const nPct = Math.round((neutral / total) * 100);
  const negPct = 100 - pPct - nPct;

  return (
    <div className=" rounded-[12px] p-6 border border-transparent shadow-sm">
      <div className="font-semibold mb-3 text-sm">Call Sentiment Analysis</div>
      {/* Progress bar with 3 separate segments (no gradient merging) */}
      <div className="w-full rounded-full bg-gray-100 overflow-hidden" style={{ height: 6 }}>
        <div className="flex w-full h-full">
          <div
            style={{ width: `${pPct}%`, backgroundColor: progressBarColors[0] }}
            className={`h-full`}
          />
          <div
            style={{ width: `${nPct}%`, backgroundColor: progressBarColors[1] }}
            className={`h-full`}
          />
          <div
            style={{ width: `${negPct}%`, backgroundColor: progressBarColors[2] }}
            className={`h-full`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: iconSize,
                height: iconSize,
                backgroundColor: fillColors.positive,
                opacity: 1,
              }}
            >
              <Image
                src="/assets/Heart-eyes.svg"
                alt="positive"
                width={emojiSize}
                height={emojiSize}
                style={{ transform: `rotate(0deg)`, opacity: 1 }}
              />
            </div>
            <div className="text-sm font-medium">Positive</div>
            <div className="text-xs text-gray-500 ml-2">{positive} Calls</div>
          </div>
          <div className="text-sm font-semibold text-brand-purple ml-4">{pPct}%</div>
        </div>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: iconSize,
                height: iconSize,
                backgroundColor: fillColors.neutral,
                opacity: 1,
              }}
            >
              <Image
                src="/assets/Smile-with-big-eyes.svg"
                alt="neutral"
                width={emojiSize}
                height={emojiSize}
                style={{ transform: `rotate(0deg)`, opacity: 1 }}
              />
            </div>
            <div className="text-sm font-medium">Neutral</div>
            <div className="text-xs text-gray-500 ml-2">{neutral} Calls</div>
          </div>
          <div className="text-sm font-semibold text-brand-purple ml-4">{nPct}%</div>
        </div>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: iconSize,
                height: iconSize,
                backgroundColor: fillColors.negative,
                opacity: 1,
              }}
            >
              <Image
                src="/assets/Pensive.svg"
                alt="negative"
                width={emojiSize}
                height={emojiSize}
                style={{ transform: `rotate(0deg)`, opacity: 1 }}
              />
            </div>
            <div className="text-sm font-medium">Negative</div>
            <div className="text-xs text-gray-500 ml-2">{negative} Calls</div>
          </div>
          <div className="text-sm font-semibold text-brand-purple ml-4">{negPct}%</div>
        </div>
      </div>
    </div>
  );
}
