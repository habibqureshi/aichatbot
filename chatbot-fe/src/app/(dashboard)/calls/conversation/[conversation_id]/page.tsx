"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getConversationMessages, Message } from "@/app/actions/conversations";
import { toast } from "react-toastify";

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${!isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          !isUser ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <p className="text-xs mt-1 opacity-70">{new Date(message.timestamp).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default function ConversationPage() {
  const params = useParams();
  const conversationId = parseInt(params.conversation_id as string);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getConversationMessages(conversationId, 1, 100);
      // Reverse the messages array to show chronological order (oldest first)
      setMessages(response.data.reverse());
      setTotalMessages(response.metadata.total);
    } catch (error: unknown) {
      console.error("Error fetching messages:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to load messages");
      }
      setMessages([]);
      setTotalMessages(0);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [fetchMessages, conversationId]);

  useEffect(() => {
    // Scroll only the chat container to the bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 h-screen flex flex-col">
      <div className="mb-4 sm:mb-6 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conversation #{conversationId}</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Chat history ({totalMessages} messages)
        </p>
      </div>

      <div
        ref={chatContainerRef}
        className="bg-white rounded-lg shadow p-4 flex-1 overflow-y-auto max-h-[75vh]"
      >
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages found.</p>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>
    </div>
  );
}
