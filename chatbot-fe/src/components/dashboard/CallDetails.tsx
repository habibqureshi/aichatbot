import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Conversation,
  Message,
  streamConversationRecording,
  getConversationMessages,
} from "@/app/actions/conversations";
import { toast } from "react-toastify";
import MessageItem from "./MessageItem";
import CallRecordingTab from "./CallRecordingTab";
import AISummaryTab from "./AISummaryTab";

type Props = {
  conversation?: Conversation | null;
  messages?: Message[]; // Not used - we fetch messages internally
  loading?: boolean;
};

type TabType = "transcript" | "recording" | "summary";

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
  const [activeTab, setActiveTab] = useState<TabType>("transcript");

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
  // debug: conversation and messages
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
  }, [conversation?.id, currentPage]);

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

  // Reset audio state when conversation changes
  useEffect(() => {
    if (audioSrc && audioSrc.startsWith("blob:")) {
      URL.revokeObjectURL(audioSrc);
    }
    setAudioSrc(null);
    setIsPlaying(false);
    setIsStreaming(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

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

  // Helper to format call duration
  const formatDuration = (startDate: string | null | undefined, endDate: string | null | undefined) => {
    if (!startDate || !endDate) return "0m";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const minutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Helper to format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  // Helper to format time
  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <aside className="w-full h-fit">
      <div
        className="rounded-xl shadow-sm"
        style={{
          minHeight: "calc(100vh - 320px)",
          maxHeight: "calc(100vh - 220px)",
        }}
      >
        {/* Header */}
        <div className="p-6">
          <h3 className="font-semibold text-brand-dark text-lg md:text-[32px] leading-[1.32]">
            Call Details
          </h3>
        </div>

        {/* Three Info Cards */}
        <div className=" pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Name Card */}
          <div className=" p-4 border border-[#D5D9E2] shadow-[0_2px_2px_0_#23272E14] rounded-[8px] ">
            <p className="font-medium text-brand-dark text-[14px] md:text-[16px] leading-[1.32]">
              Customer Name
            </p>
            <div className="font-semibold text-brand-dark text-xl mt-4 mb-4 leading-[1.32] flex items-center gap-2">
              <Image src={"/assets/calls/User.svg"} alt="Phone" width={24} height={24} />
              {caller}
            </div>
            <div className="text-xs text-gray-500">{phone}</div>
          </div>

          {/* Call Duration Card */}
          <div className=" p-4 border border-[#D5D9E2] shadow-[0_2px_2px_0_#23272E14] rounded-[8px] ">
            <p className="font-medium text-brand-dark text-[14px] md:text-[16px] leading-[1.32]">
              Call Duration
            </p>
            <div className="font-semibold text-brand-dark text-xl mt-4 mb-4 leading-[1.32] flex items-center gap-2">
              <Image src={"/assets/calls/Clock.svg"} alt="Phone" width={24} height={24} />
              {formatDuration(conversation?.started_at || null, conversation?.ended_at || null)}
            </div>
            <div className="mt-3">
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Call Date & Time Card */}
          <div className=" p-4 h-auto md:max-h-[159px] border border-[#D5D9E2] shadow-[0_2px_2px_0_#23272E14] rounded-[8px] ">
            <p className="font-medium text-brand-dark text-[14px] md:text-[16px] leading-[1.32]">
              Call Date & Time
            </p>
            <div className="font-semibold text-brand-dark text-xl mt-1 mb-2 leading-[1.32] flex items-center gap-2">
              <Image src={"/assets/calls/Clock.svg"} alt="Phone" width={24} height={24} />
              {formatDate(conversation?.started_at)}
            </div>

            <div className="font-semibold text-brand-dark text-sm">
              {formatTime(conversation?.started_at)}
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-400">Resolution</div>
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-400">Recorded Follow-up scheduled</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className=" p-6 border border-[#D5D9E2] shadow-[0_2px_2px_0_#23272E14] rounded-[16px] ">
          <div className="flex gap-6 border-b" style={{ borderBottomColor: "#E6E7EB" }}>
            {[
              { id: "transcript", label: "Call Transcript" },
              { id: "recording", label: "Call Recording" },
              { id: "summary", label: "AI Summary" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`pb-3 transition-colors min-w-[160px] ${
                  activeTab === id
                    ? "text-[#6325A9] border-b-2 border-[#6325A9]"
                    : "text-[#4C5564] hover:text-gray-700"
                }`}
                style={{
                  fontFamily: "Figtree",
                  fontWeight: 500,
                  fontSize: "20px",
                  lineHeight: "132%",
                  letterSpacing: "0%",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {/* Call Transcript Tab */}
            {activeTab === "transcript" && (
              <div className="space-y-4">
                <div
                  ref={messagesContainerRef}
                  className="min-h-[300px] max-h-[400px] overflow-y-auto pr-2"
                >
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
                      <>
                        <div className="flex justify-start">
                          <div
                            className="h-12 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"
                            style={{ background: "#E8E3FF" }}
                          ></div>
                        </div>
                        <div className="flex justify-end">
                          <div
                            className="h-12 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"
                            style={{ background: "#E8E3FF" }}
                          ></div>
                        </div>
                        <div className="flex justify-start">
                          <div
                            className="h-12 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"
                            style={{ background: "#E8E3FF" }}
                          ></div>
                        </div>
                        <div className="flex justify-end">
                          <div
                            className="h-12 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"
                            style={{ background: "#E8E3FF" }}
                          ></div>
                        </div>
                      </>
                    ) : messages && messages.length > 0 ? (
                      messages.map((message) => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          patientName={conversation?.patient?.name || "Customer"}
                          formattedTime={formatTime(message.timestamp)}
                        />
                      ))
                    ) : (
                      <div className="flex justify-center">
                        <div className="p-3 rounded-lg text-gray-500" style={{ background: "#F5F3FF" }}>
                          <p>No chat transcript available</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>
            )}

            {/* Call Recording Tab */}
            {activeTab === "recording" && (
              <CallRecordingTab
                conversation={conversation}
                audioSrc={audioSrc}
                isPlaying={isPlaying}
                isStreaming={isStreaming}
                handlePlayRecording={handlePlayRecording}
                setIsPlaying={setIsPlaying}
              />
            )}

            {/* AI Summary Tab */}
            {activeTab === "summary" && <AISummaryTab summary={summary} messages={messages} />}
          </div>
        </div>
      </div>
    </aside>
  );
}
