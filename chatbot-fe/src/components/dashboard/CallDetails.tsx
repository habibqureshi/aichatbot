import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Conversation,
  Message,
  streamConversationRecording,
  getConversationMessages,
} from "@/app/actions/conversations";
import { toast } from "react-toastify";

type Props = {
  conversation?: Conversation | null;
  messages?: Message[]; // Not used - we fetch messages internally
  loading?: boolean;
};
const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<string, { bg: string; text: string }> = {
    active: { bg: "#06A35A", text: "#FFFFFF" },
    confirmed: { bg: "#10B981", text: "#FFFFFF" },
    pending: { bg: "#FBBF24", text: "#FFFFFF" },
    cancelled: { bg: "#EF4444", text: "#FFFFFF" },
    canceled: { bg: "#EF4444", text: "#FFFFFF" },
    completed: { bg: "#3B82F6", text: "#FFFFFF" },
    rescheduled: { bg: "#3B82F6", text: "#FFFFFF" },
  };

  const cleanStatus = status?.trim().toLowerCase();
  const style = statusStyles[cleanStatus] || { bg: "#6B7280", text: "#FFFFFF" };

  return (
    <span
      className="inline-flex px-3 py-1 text-xs font-medium rounded"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
export default function CallDetails({
  conversation,
  messages: initialMessages = [],
  loading: initialLoading = false,
}: Props) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Pagination state
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(initialLoading);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs for scroll handling
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const previousScrollHeightRef = useRef(0);

  // Load initial messages
  const loadInitialMessages = useCallback(async () => {
    if (!conversation?.id) return;

    try {
      setLoading(true);
      const response = await getConversationMessages(conversation.id, 1, 10);

      // Messages come from API, display them in chronological order (oldest first)
      setMessages(response.data.reverse());
      setCurrentPage(1);
      setTotalPages(response.metadata.total_pages);
      setHasMoreMessages(response.metadata.page < response.metadata.total_pages);
      setIsInitialLoad(true);
    } catch (error) {
      console.error("Error loading initial messages:", error);
      setMessages([]);
      setHasMoreMessages(false);
    } finally {
      setLoading(false);
    }
  }, [conversation?.id]);

  // Load more (older) messages
  const loadMoreMessages = useCallback(async () => {
    if (!conversation?.id) {
      // console.log("Load more prevented: No conversation ID");
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      // console.log(`Loading page ${nextPage} of ${totalPages}`);

      // Save current scroll position
      const container = messagesContainerRef.current;
      if (container) {
        previousScrollHeightRef.current = container.scrollHeight;
      }

      const response = await getConversationMessages(conversation.id, nextPage, 10);
      // console.log(`Loaded ${response.data.length} messages from page ${nextPage}`);

      // Prepend older messages (reversed so oldest are at the top)
      setMessages((prev) => [...response.data.reverse(), ...prev]);
      setCurrentPage(nextPage);
      setHasMoreMessages(nextPage < response.metadata.total_pages);

      // Restore scroll position after new messages are added
      setTimeout(() => {
        if (container && previousScrollHeightRef.current) {
          const newScrollHeight = container.scrollHeight;
          const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
          container.scrollTop = scrollDiff;
          // console.log("Scroll restored:", { scrollDiff, newScrollTop: container.scrollTop });
        }
        isLoadingRef.current = false;
      }, 50);
    } catch (error) {
      console.error("Error loading more messages:", error);
      setHasMoreMessages(false);
      isLoadingRef.current = false;
    } finally {
      setLoadingMore(false);
    }
  }, [conversation?.id, currentPage, totalPages]);

  // Reset pagination when conversation changes
  useEffect(() => {
    if (conversation?.id) {
      setMessages([]);
      setCurrentPage(1);
      setHasMoreMessages(true);
      setLoading(true);
      setIsInitialLoad(true);
      isLoadingRef.current = false;

      // Load initial messages
      loadInitialMessages();
    }
  }, [conversation?.id, loadInitialMessages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (isInitialLoad && messages.length > 0 && messagesContainerRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          // Scroll the container to the bottom
          container.scrollTop = container.scrollHeight;
        }
        setIsInitialLoad(false);
      }, 100);
    }
  }, [messages, isInitialLoad]);

  // Handle scroll for pagination (load older messages)
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;

    // Prevent multiple simultaneous loads - check BEFORE setting the flag
    if (isLoadingRef.current || loadingMore || !hasMoreMessages || currentPage >= totalPages) {
      return;
    }

    // Load more when user scrolls near the top (within 100px)
    if (scrollTop < 100) {
      isLoadingRef.current = true;
      loadMoreMessages();
    }
  }, [hasMoreMessages, loadingMore, currentPage, totalPages, loadMoreMessages]);

  // Add scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Cleanup blob URLs to prevent memory leaks on unmount
  useEffect(() => {
    return () => {
      if (audioSrc && audioSrc.startsWith("blob:")) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [audioSrc]);
  // Fallback values if no conversation is selected
  const caller = conversation?.patient?.name || "Not Available";
  const phone = conversation?.patient?.phone_number || "Not Available";
  const status = conversation?.status || "Unknown";
  const summary =
    (conversation && (conversation as unknown as { summary?: string }).summary) ||
    "No summary available.";
  const handlePlayRecording = async () => {
    if (!conversation?.id) return;

    try {
      setIsStreaming(true);
      // console.log("Fetching recording for conversation:", conversation.id);
      const streamData = await streamConversationRecording(conversation.id);

      // Convert ArrayBuffer to blob URL for audio playback
      const audioBlob = new Blob([streamData], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Set the audio source
      setAudioSrc(audioUrl);
      setIsPlaying(true);
    } catch (error: unknown) {
      console.error("Error streaming recording:", error);

      // The error message is already formatted by axios interceptor
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to load recording. Please try again.");
      }

      // Reset audio state on error
      setAudioSrc(null);
      setIsPlaying(false);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <aside className="w-full h-fit">
      <div
        className="bg-[#FFFFFF80] backdrop-blur-sm border border-[#E3C5FF55] rounded-xl p-4 shadow-sm"
        style={{
          // background: "var(--lighter-purple-bg)",
          minHeight: "calc(100vh - 320px)",
          maxHeight: "calc(100vh -220px)",
        }}
      >
        <div
          className="flex items-center justify-between cursor-pointer mb-6 group"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
        >
          <h3 className="calldetails-title">Call Details</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 opacity-100  transition-opacity duration-200">
              {isDetailsOpen ? "Hide" : "View"}
            </span>
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${
                isDetailsOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div className="bg-[#E6E4FB] h-[0.5px] my-4" />
        <div className="space-y-5">
          <div
            className={`transition-all duration-500 ease-in-out origin-top ${
              isDetailsOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 h-0 overflow-hidden"
            }`}
          >
            <div className="space-y-5">
              <div>
                <div className="calldetails-label mb-1">Caller</div>
                <div className="calldetails-value">{caller}</div>
              </div>

              <div>
                <div className="calldetails-label mb-1">Phone no</div>
                <div className="calldetails-value">{phone}</div>
              </div>

              <div>
                <div className="calldetails-label mb-2">Status</div>
                <div className="mt-2 inline-block">
                  <StatusBadge status={status} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#E6E4FB] rounded-lg p-4">
            <div className="calldetails-section-title mb-2">Summary</div>
            <div className=" rounded-lg border p-3 min-h-[70px]">
              <p className="calldetails-summary-text">{summary}</p>
            </div>
          </div>
          <div className="bg-[#E6E4FB] rounded-lg p-4">
            <div className="calldetails-section-title mb-3">Transcript Preview</div>
            <div ref={messagesContainerRef} className="min-h-[200px] max-h-[400px] overflow-y-auto">
              <div className="space-y-3">
                {loadingMore && (
                  <div className="flex justify-center py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                )}
                {loading ? (
                  // Skeleton loader for messages
                  <>
                    <div className="flex justify-start">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-end">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-start">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-end">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                  </>
                ) : messages && messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`text-sm p-3 rounded-lg max-w-xs lg:max-w-[255px] ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-[#EEEAFF] to-[#DAD2FF] text-[#4318FF]"
                            : "bg-white text-gray-700 border"
                        }`}
                      >
                        <p
                          className={
                            message.role === "user" ? "calldetails-chat-user" : "calldetails-chat-bot"
                          }
                        >
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-center">
                    <div className="p-3 rounded-lg bg-gray-100 text-gray-500">
                      <p>No chat transcript available</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handlePlayRecording}
              disabled={isStreaming || !conversation?.id}
              className="w-full bg-gradient-to-r from-[#9882F7] to-[#4318FF] text-white py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                width={20}
                height={20}
                src="/assets/images/audioIcon.svg"
                alt="Audio icon"
                className="flex-shrink-0"
              />
              {isStreaming ? (
                <>
                  <span>Loading</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-white rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-white rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </>
              ) : (
                "Play Recording"
              )}
            </button>
          </div>

          {/* Audio Player */}
          {audioSrc && (
            <div className="mt-4">
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
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
