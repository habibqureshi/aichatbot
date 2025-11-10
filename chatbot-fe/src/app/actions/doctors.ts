"use server";

import { API } from "@/app/http/axio";import { ENDPOINTS } from "@/app/http/endpoints";

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

export async function createDoctor(
  doctorData: {
    name: string;
    specialty_id: number;
    phone_number: string;
    availabilities: Array<{
      start_time: string;
      end_time: string;
      day_of_week: string;
    }>;
    duration: number;
  },
  user_timezone: string = "UTC"
): Promise<Doctor> {
  try {
    const response = await API.post(`/api/v1/doctors/?user_timezone=${user_timezone}`, doctorData);
    console.log("Create doctor response:", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error creating doctor:", error);
    throw new Error("Failed to create doctor");
  }
}

export async function getDoctorsList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  specialty_id?: number,
  name?: string
): Promise<DoctorsResponse> {
  try {
    const response = await API.get(
      ENDPOINTS.DOCTORS.LIST(page, limit, user_timezone, specialty_id, name)
    );
    console.log("api responsex", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching doctors list:", error);
    throw new Error("Failed to fetch doctors list");
  }
}