"use server";

import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export interface Speciality {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface SpecialitiesResponse {
  data: Speciality[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export async function getSpecialitiesList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC"
): Promise<SpecialitiesResponse> {
  try {
    const response = await API.get(ENDPOINTS.SPECIALITIES.LIST(page, limit, user_timezone));
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching specialities list:", error);
    throw new Error("Failed to fetch specialities list");
  }
}
