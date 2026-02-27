import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UsageResponse } from "../types/api";

export function useUsage(params?: { startDate?: string; endDate?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set("start_date", params.startDate);
  if (params?.endDate) searchParams.set("end_date", params.endDate);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["usage", params?.startDate, params?.endDate],
    queryFn: () => api.get<UsageResponse>(`/usage${qs ? `?${qs}` : ""}`),
  });
}
