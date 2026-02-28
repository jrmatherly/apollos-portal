import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UserSettingsResponse, UserSettingsUpdate } from "../types/api";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<UserSettingsResponse>("/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserSettingsUpdate) =>
      api.patch<UserSettingsResponse>("/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
