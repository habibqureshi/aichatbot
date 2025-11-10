"use server";

import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export interface Doctor {
  id: number;
  name: string;
  specialty: {
    id: number;
    name: string;
  };
  phone_number: string;
  created_at: string;
}

export interface DoctorsResponse {
  data: Doctor[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export async function getDoctorsList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  specialty_id?: number
): Promise<DoctorsResponse> {
  try {
    const response = await API.get(ENDPOINTS.DOCTORS.LIST(page, limit, user_timezone, specialty_id));
    console.log("api responsex", response);
    return response.data;
  } catch (error) {
    console.error("Error fetching doctors list:", error);
    throw new Error("Failed to fetch doctors list");
  }
}
