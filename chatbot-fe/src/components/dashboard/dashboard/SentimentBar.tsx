"use client";
import React from "react";

type Props = {
  positive: number;
  neutral: number;
  negative: number;
};

export default function SentimentBar({ positive, neutral, negative }: Props) {
  const total = positive + neutral + negative || 1;
  const pPct = Math.round((positive / total) * 100);
  const nPct = Math.round((neutral / total) * 100);
  const negPct = 100 - pPct - nPct;

  return (
    <div className="bg-white rounded-[12px] p-6 border border-transparent shadow-sm">
      <div className="font-semibold mb-3 text-sm">Call Sentiment Analysis</div>
      <div className="w-full rounded-full h-3 bg-gray-100 overflow-hidden">
        <div className="h-full inline-block" style={{ width: `${pPct}%`, backgroundColor: "#62b34a" }} />
        <div className="h-full inline-block" style={{ width: `${nPct}%`, backgroundColor: "#F59E0B" }} />
        <div
          className="h-full inline-block"
          style={{ width: `${negPct}%`, backgroundColor: "#EF4444" }}
        />
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div className="text-xs">Positive</div>
          <div className="text-xs text-gray-500 ml-2">{positive} Calls</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="text-xs">Neutral</div>
          <div className="text-xs text-gray-500 ml-2">{neutral} Calls</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="text-xs">Negative</div>
          <div className="text-xs text-gray-500 ml-2">{negative} Calls</div>
        </div>
      </div>
    </div>
  );
}
