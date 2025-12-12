import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";

export interface TotalCallsResponse {
  total: number;
}

export interface AverageDurationResponse {
  average_seconds: number;
}

export interface ConversionRateResponse {
  conversion_rate: number;
}

export interface LiveActivityResponse {
  active_calls: number;
  calls: Array<{
    call_sid: string;
    conversation_id: number;
    patient_name: string;
    patient_phone: string;
    started_at: string;
  }>;
}

export interface TimeseriesData {
  label: string;
  successful: number;
  failed: number;
  total: number;
}

export type TimeseriesResponse = TimeseriesData[];

export async function getTotalCalls(start: string, end: string): Promise<TotalCallsResponse> {
  const response = await API.get(ENDPOINTS.STATS.TOTAL_CALLS(start, end));
  return response.data;
}

export async function getAverageDuration(start: string, end: string): Promise<AverageDurationResponse> {
  const response = await API.get(ENDPOINTS.STATS.AVERAGE_DURATION(start, end));
  return response.data;
}

export async function getConversionRate(start: string, end: string): Promise<ConversionRateResponse> {
  const response = await API.get(ENDPOINTS.STATS.CONVERSION_RATE(start, end));
  return response.data;
}

export async function getLiveActivity(): Promise<LiveActivityResponse> {
  const response = await API.get(ENDPOINTS.STATS.LIVE());
  return response.data;
}

export async function getTimeseries(
  start: string,
  end: string,
  interval: string = "month"
): Promise<TimeseriesResponse> {
  const response = await API.get(ENDPOINTS.STATS.TIMESERIES(start, end, interval));
  return response.data;
}
