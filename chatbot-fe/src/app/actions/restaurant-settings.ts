"use server";

export interface RestaurantSettings {
  id?: number;
  restaurant_name: string;
  opening_time: string;
  closing_time: string;
  slot_duration: number; // in minutes
  max_advance_booking_days: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Mock data for restaurant settings
let mockRestaurantSettings: RestaurantSettings = {
  id: 1,
  restaurant_name: "The Gourmet Kitchen",
  opening_time: "09:00",
  closing_time: "22:00",
  slot_duration: 30,
  max_advance_booking_days: 30,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In a real app, this would fetch from your backend
  return mockRestaurantSettings;
}

export async function updateRestaurantSettings(
  settings: Partial<RestaurantSettings>
): Promise<RestaurantSettings> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Update the mock data
  mockRestaurantSettings = {
    ...mockRestaurantSettings,
    ...settings,
    updated_at: new Date().toISOString(),
  };

  return mockRestaurantSettings;
}
