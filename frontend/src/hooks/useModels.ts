import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ModelsResponse } from "../types/api";

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: () => api.get<ModelsResponse>("/models"),
  });
}
