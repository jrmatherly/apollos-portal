import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { TeamsResponse } from "../types/api";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<TeamsResponse>("/teams"),
  });
}
