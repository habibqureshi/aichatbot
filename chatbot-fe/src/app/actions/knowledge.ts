"use server";

import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";
import { KnowledgeResponse, Knowledge } from "@/app/types/knowledge";

export async function getKnowledgeList(): Promise<KnowledgeResponse> {
  try {
    const response = await API.get(ENDPOINTS.KNOWLEDGE.LIST);
    return response.data;
  } catch (error) {
    console.error("Error fetching knowledge list:", error);
    throw new Error("Failed to fetch knowledge list");
  }
}

export async function createKnowledge(formData: FormData): Promise<Knowledge> {
  try {
    const response = await API.post(ENDPOINTS.KNOWLEDGE.CREATE, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating knowledge:", error);
    throw new Error("Failed to create knowledge");
  }
}

export async function updateActiveKnowledge(knowledgeId: string): Promise<void> {
  try {
    await API.put(ENDPOINTS.KNOWLEDGE.UPDATE_ACTIVE, { knowledgeId });
  } catch (error) {
    console.error("Error updating active knowledge:", error);
    throw new Error("Failed to update active knowledge");
  }
}
