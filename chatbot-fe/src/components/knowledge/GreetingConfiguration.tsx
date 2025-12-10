"use client";

import { Button } from "@/components/ui/button";

interface GreetingConfigurationProps {
  greetingMessage: string;
  setGreetingMessage: (message: string) => void;
  isTraining: boolean;
  handleTrainAI: () => void;
}

export default function GreetingConfiguration({
  greetingMessage,
  setGreetingMessage,
  isTraining,
  handleTrainAI,
}: GreetingConfigurationProps) {
  return (
    <div
      className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[400px] flex flex-col"
      style={{
        background: "#FFFFFF",
        borderColor: "#F0EEFF",
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-14 h-14 bg-[#6325A9] rounded-lg flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-black">Dynamic Greeting Configuration</h2>
          <p className="text-sm text-[#64748B] mt-1">
            First Impression - Different Greetings for different situations
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-black text-lg leading-[1.32] mb-2">Default Greeting</h4>

          <textarea
            id="greeting-message"
            value={greetingMessage}
            onChange={(e) => setGreetingMessage(e.target.value)}
            className="w-full p-5 rounded-lg bg-[#F3F3F5] text-black font-medium focus:outline-none resize-none"
            placeholder="Hello! I'm your MediCall AI assistant. How can I help you today?"
            rows={3}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleTrainAI}
            disabled={isTraining || !greetingMessage.trim()}
            className="btn-primary-gradient"
          >
            {isTraining ? "Updating..." : "Update Agent"}
          </Button>
        </div>

        <div className="bg-[#6325A912] rounded-lg p-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#6325A9] flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-[#6325A9]">
              <strong>Preview Updates Live:</strong> Changes to your greeting message appear instantly in
              the chat preview
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
