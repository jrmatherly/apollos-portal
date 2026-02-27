import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ProvisionResponse, ProvisionStatusResponse } from "../types/api";

export function useProvisionStatus() {
  return useQuery({
    queryKey: ["provisionStatus"],
    queryFn: () => api.get<ProvisionStatusResponse>("/status"),
  });
}

export function useProvision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ProvisionResponse>("/provision"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provisionStatus"] });
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
