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
  return useMutation({
    mutationFn: () => api.post<ProvisionResponse>("/provision"),
  });
}

/** Invalidate provisioning-related queries. Call when the user completes the provisioning flow. */
export function useInvalidateProvisionQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["provisionStatus"] });
    queryClient.invalidateQueries({ queryKey: ["keys"] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  };
}
