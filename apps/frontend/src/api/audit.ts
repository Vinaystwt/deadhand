import { apiClient } from "./client";

export interface AuditEvent {
  id: string;
  userId: string;
  taskId?: string | null;
  actionId?: string | null;
  eventType: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface AuditQuery {
  taskId?: string;
  actionId?: string;
  eventType?: string;
  reasonCode?: string;
  severity?: string;
  storyClass?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export const auditApi = {
  list: async (query?: AuditQuery): Promise<AuditEvent[]> => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v));
      });
    }
    const { data } = await apiClient.get(`/audit?${params.toString()}`);
    return data;
  },

  get: async (id: string): Promise<AuditEvent> => {
    const { data } = await apiClient.get(`/audit/${id}`);
    return data;
  },
};
