import { API } from "@/app/http/axio";

export interface TableBooking {
  id: number;
  customer_id: number;
  table_id: number;
  booking_date: string;
  booking_time: string;
  party_size: number;
  status: string;
  notes: string;
  call_sid: string;
  created_at: string;
  customer: {
    id: number;
    phone_number: string;
    name: string;
    created_at: string;
  };
  table: {
    id: number;
    table_number: string;
    capacity: number;
    created_at: string;
  };
}

export interface TableBookingsResponse {
  data: TableBooking[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export async function getTableBookingsList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  table_id?: number,
  customer_id?: number,
  status?: string,
  name?: string
): Promise<TableBookingsResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      user_timezone,
    });
    if (table_id !== undefined) {
      params.append("table_id", table_id.toString());
    }
    if (customer_id !== undefined) {
      params.append("customer_id", customer_id.toString());
    }
    if (status && status.trim()) {
      params.append("status", status.trim());
    }
    if (name && name.trim()) {
      params.append("name", name.trim());
    }

    const response = await API.get(`/api/v1/table-bookings/?${params.toString()}`);
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching table bookings list:", error);
    throw new Error("Failed to fetch table bookings list");
  }
}
