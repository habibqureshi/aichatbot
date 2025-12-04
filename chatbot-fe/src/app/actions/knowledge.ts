import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";
import { KnowledgeResponse } from "@/app/types/knowledge";

export async function getKnowledgeList(
  page: number = 1,
  limit: number = 10
): Promise<KnowledgeResponse> {
  try {
    const response = await API.get(ENDPOINTS.KNOWLEDGE.LIST(page, limit));
    return response.data;
  } catch (error) {
    console.error("Error fetching knowledge list:", error);
    throw new Error("Failed to fetch knowledge list");
  }
}

export async function createKnowledge(formData: FormData): Promise<string> {
  try {
    console.log("FORM DATA...", formData);
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

export async function deleteKnowledge(knowledgeId: number): Promise<string> {
  try {
    const response = await API.delete(ENDPOINTS.KNOWLEDGE.DELETE(knowledgeId));
    return response.data;
  } catch (error) {
    console.error("Error deleting knowledge:", error);
    throw new Error("Failed to delete knowledge");
  }
}
