import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export interface Speciality {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface SpecialitiesResponse {
  data: string[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface CreateSpecialityRequest {
  name: string;
  description: string;
}

export interface UpdateSpecialityRequest {
  name: string;
  description: string;
}

export async function getSpecialitiesList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  name?: string
): Promise<SpecialitiesResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      user_timezone,
    });
    if (name && name.trim()) {
      params.append("name", name.trim());
    }
    const response = await API.get(`/api/v1/specialities/?${params.toString()}`);
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching specialities list:", error);
    throw new Error("Failed to fetch specialities list");
  }
}

export async function getSpeciality(
  specialityId: number,
  user_timezone: string = "UTC"
): Promise<Speciality> {
  try {
    const response = await API.get(ENDPOINTS.SPECIALITIES.GET(specialityId, user_timezone));
    return response.data;
  } catch (error) {
    console.error("Error fetching speciality:", error);
    throw new Error("Failed to fetch speciality");
  }
}

export async function createSpeciality(
  data: CreateSpecialityRequest,
  user_timezone: string = "UTC"
): Promise<Speciality> {
  try {
    const response = await API.post(ENDPOINTS.SPECIALITIES.CREATE(user_timezone), data);
    return response.data;
  } catch (error) {
    console.error("Error creating speciality:", error);
    throw new Error("Failed to create speciality");
  }
}

export async function updateSpeciality(
  specialityId: number,
  data: UpdateSpecialityRequest,
  user_timezone: string = "UTC"
): Promise<Speciality> {
  try {
    const response = await API.put(ENDPOINTS.SPECIALITIES.UPDATE(specialityId, user_timezone), data);
    return response.data;
  } catch (error) {
    console.error("Error updating speciality:", error);
    throw new Error("Failed to update speciality");
  }
}

export async function deleteSpeciality(specialityId: number): Promise<void> {
  try {
    await API.delete(ENDPOINTS.SPECIALITIES.DELETE(specialityId));
  } catch (error) {
    console.error("Error deleting speciality:", error);
    throw new Error("Failed to delete speciality");
  }
}
