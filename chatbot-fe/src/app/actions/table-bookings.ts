import { API } from "@/app/http/axio";

export interface TableBooking {
  id: number;
  customer_id: number;
  table_id: number;
  reservation_date: string;
  party_size: number;
  status: string;
  special_request: string;
  created_at: string;
  cancelled_at: string | null;
  customer: {
    id: number;
    phone_number: string;
    name: string;
    created_at: string;
  };
  table: {
    capacity: number;
    table_number: string;
    location: string;
    is_active: boolean;
    id: number;
    created_at: string;
  };
}

export interface RestaurantTable {
  id: number;
  capacity: number;
  table_number: string;
  location: string;
  is_active: boolean;
  created_at: string;
}

export interface RestaurantReservationsResponse {
  data: TableBooking[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface RestaurantTablesResponse {
  data: RestaurantTable[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export async function getRestaurantReservationsList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  table_id?: number,
  customer_id?: number,
  status?: string,
  name?: string
): Promise<RestaurantReservationsResponse> {
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

    const response = await API.get(`/api/v1/restaurant/reservations?${params.toString()}`);
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching restaurant reservations list:", error);
    throw new Error("Failed to fetch restaurant reservations list");
  }
}

export async function getRestaurantTablesList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC"
): Promise<RestaurantTablesResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      user_timezone,
    });

    const response = await API.get(`/api/v1/restaurant/tables?${params.toString()}`);
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching restaurant tables list:", error);
    throw new Error("Failed to fetch restaurant tables list");
  }
}

export async function getRestaurantTable(
  table_id: number,
  user_timezone: string = "UTC"
): Promise<RestaurantTable> {
  try {
    const params = new URLSearchParams({
      user_timezone,
    });

    const response = await API.get(`/api/v1/restaurant/tables/${table_id}?${params.toString()}`);
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching restaurant table:", error);
    throw new Error("Failed to fetch restaurant table");
  }
}

export async function createRestaurantTable(
  data: {
    capacity: number;
    table_number: string;
    location: string;
    is_active: boolean;
  },
  user_timezone: string = "UTC"
): Promise<RestaurantTable> {
  try {
    const params = new URLSearchParams({
      user_timezone,
    });

    const response = await API.post(`/api/v1/restaurant/tables?${params.toString()}`, data);
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error creating restaurant table:", error);
    throw new Error("Failed to create restaurant table");
  }
}

export async function updateRestaurantTable(
  table_id: number,
  data: {
    capacity: number;
    table_number: string;
    location: string;
    is_active: boolean;
  },
  user_timezone: string = "UTC"
): Promise<RestaurantTable> {
  try {
    const params = new URLSearchParams({
      user_timezone,
    });

    const response = await API.put(`/api/v1/restaurant/tables/${table_id}?${params.toString()}`, data);
    console.log("api response", response?.data);
    return response.data;
  } catch (error) {
    console.error("Error updating restaurant table:", error);
    throw new Error("Failed to update restaurant table");
  }
}
