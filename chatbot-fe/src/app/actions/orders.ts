import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export const ORDER_STATUS_OPTIONS = ["draft", "confirmed", "preparing", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUS_OPTIONS)[number];

export interface OrderItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: number;
  customer_id: number;
  status: string;
  total_amount: number;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    phone_number: string | null;
    name: string | null;
    created_at: string;
  } | null;
  items: OrderItem[];
}

export interface OrdersResponse {
  data: Order[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export async function getOrdersList(
  page: number = 1,
  limit: number = 10,
  user_timezone: string = "UTC",
  status?: string,
  name?: string,
): Promise<OrdersResponse> {
  try {
    const response = await API.get(ENDPOINTS.ORDERS.LIST(page, limit, user_timezone, status, name));
    return response.data;
  } catch (error) {
    console.error("Error fetching orders list:", error);
    throw new Error("Failed to fetch orders list");
  }
}

export async function getOrderById(
  orderId: number,
  user_timezone: string = "UTC",
): Promise<Order> {
  try {
    const response = await API.get(ENDPOINTS.ORDERS.GET(orderId, user_timezone));
    return response.data;
  } catch (error) {
    console.error("Error fetching order details:", error);
    throw new Error("Failed to fetch order details");
  }
}

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
  user_timezone: string = "UTC",
): Promise<Order> {
  try {
    const response = await API.patch(ENDPOINTS.ORDERS.UPDATE_STATUS(orderId, user_timezone), {
      status,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw new Error("Failed to update order status");
  }
}
