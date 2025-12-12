import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export interface Conversation {
  id: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  call_sid: string;
  patient: {
    id: number;
    phone_number: string;
    name: string;
    created_at: string;
  };
  summary: string | null;
  recording_available: boolean;
}

export interface ConversationsResponse {
  data: Conversation[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface Message {
  id: number;
  content: string;
  role: string;
  timestamp: string;
}

export interface ConversationMessagesResponse {
  data: Message[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export async function getConversationMessages(
  conversationId: number,
  page: number = 1,
  limit: number = 10
): Promise<ConversationMessagesResponse> {
  const response = await API.get(ENDPOINTS.CONVERSATIONS.MESSAGES(conversationId, page, limit));
  return response.data;
}

export async function streamConversationRecording(conversationId: number): Promise<ArrayBuffer> {
  const response = await API.get(ENDPOINTS.CONVERSATIONS.STREAM(conversationId), {
    responseType: "arraybuffer",
  });
  return response.data;
}
export async function getConversationsList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  status?: string,
  name?: string
): Promise<ConversationsResponse> {
  const response = await API.get(ENDPOINTS.CONVERSATIONS.LIST(page, limit, user_timezone, status, name));
  // console.log("api response", response?.data);
  return response.data;
}
