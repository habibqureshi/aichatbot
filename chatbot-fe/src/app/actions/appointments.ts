import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
  call_sid: string;
  created_at: string;
  patient: {
    id: number;
    phone_number: string;
    name: string;
    created_at: string;
  };
  doctor: {
    id: number;
    name: string;
    specialty: {
      id: number;
      name: string;
    };
    phone_number: string;
    created_at: string;
    duration: number;
  };
}

export interface AppointmentsResponse {
  data: Appointment[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export async function getAppointmentsList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  doctor_id?: number,
  patient_id?: number,
  status?: string,
  name?: string
): Promise<AppointmentsResponse> {
  try {
    const response = await API.get(
      ENDPOINTS.APPOINTMENTS.LIST(page, limit, user_timezone, doctor_id, patient_id, status, name)
    );
    // console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching appointments list:", error);
    throw new Error("Failed to fetch appointments list");
  }
}
