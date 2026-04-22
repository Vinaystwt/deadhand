import { useQuery } from "@tanstack/react-query";
import { auditApi, type AuditQuery } from "@/api/audit";

export function useAuditEvents(query?: AuditQuery) {
  return useQuery({
    queryKey: ["audit", query],
    queryFn: () => auditApi.list(query),
    staleTime: 10_000,
  });
}

export function useAuditEvent(id: string) {
  return useQuery({
    queryKey: ["audit", id],
    queryFn: () => auditApi.get(id),
    enabled: !!id,
  });
}
