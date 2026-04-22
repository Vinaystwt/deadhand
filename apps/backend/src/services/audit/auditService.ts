import type { AuditEvent, AuditQuery } from "@deadhand/types";
import { matchesAuditQuery } from "../../domain/audit.js";
import { HttpError } from "../../lib/httpError.js";
import type { AuditRepository } from "../../domain/types.js";

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(event: AuditEvent): Promise<void> {
    await this.auditRepository.append(event);
  }

  async listByUser(userId: string, query?: AuditQuery): Promise<AuditEvent[]> {
    const events = await this.auditRepository.listByUser(userId);
    return events.filter((event) => matchesAuditQuery(event, query)).slice(0, query?.limit ?? 100);
  }

  async getById(userId: string, eventId: string): Promise<AuditEvent> {
    const event = await this.auditRepository.getById(userId, eventId);
    if (!event) {
      throw new HttpError(404, "Audit event not found");
    }

    return event;
  }
}
