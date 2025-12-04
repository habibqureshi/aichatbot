import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  phone_number: string;
  created_at: string;
  duration: number;
  availabilities: Array<{
    start_time: string;
    end_time: string;
    day_of_week: string;
  }>;
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
    specialty: string;
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

export async function getDoctorById(doctorId: number, user_timezone: string = "UTC"): Promise<Doctor> {
  try {
    const response = await API.get(`/api/v1/doctors/${doctorId}?user_timezone=${user_timezone}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching doctor:", error);
    throw new Error("Failed to fetch doctor");
  }
}

export async function updateDoctor(
  doctorId: number,
  doctorData: {
    name: string;
    specialty: string;
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
    // console.log("Update Payload (doctorData):", JSON.stringify(doctorData, null, 2));
    // console.log("Update Payload doctorId:", doctorId);
    const response = await API.put(
      `/api/v1/doctors/${doctorId}?user_timezone=${user_timezone}`,
      doctorData
    );
    console.log("Update doctor response:", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error updating doctor:", error);
    throw new Error("Failed to update doctor");
  }
}

export async function deleteDoctor(doctorId: number): Promise<void> {
  try {
    await API.delete(`/api/v1/doctors/${doctorId}`);
  } catch (error) {
    console.error("Error deleting doctor:", error);
    throw new Error("Failed to delete doctor");
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
