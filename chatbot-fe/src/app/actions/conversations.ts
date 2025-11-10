"use server";

import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export interface Conversation {
  id: number;
  started_at: string;
  ended_at: string;
  status: string;
  call_sid: string;
  patient: {
    id: number;
    phone_number: string;
    name: string;
    created_at: string;
  };
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

export async function getConversationsList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  status?: string,
  name?: string
): Promise<ConversationsResponse> {
  try {
    const response = await API.get(
      ENDPOINTS.CONVERSATIONS.LIST(page, limit, user_timezone, status, name)
    );
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching conversations list:", error);
    throw new Error("Failed to fetch conversations list");
  }
}
