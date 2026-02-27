import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  KeyCreateResponse,
  KeyListResponse,
  KeyRevokeResponse,
  KeyRotateResponse,
} from "../types/api";

export function useKeys() {
  return useQuery({
    queryKey: ["keys"],
    queryFn: () => api.get<KeyListResponse>("/keys"),
  });
}

export function useCreateKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => api.post<KeyCreateResponse>("/keys/new", { team_id: teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    },
  });
}

export function useRotateKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.post<KeyRotateResponse>(`/keys/${keyId}/rotate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    },
  });
}

export function useRevokeKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.post<KeyRevokeResponse>(`/keys/${keyId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
    },
  });
}
