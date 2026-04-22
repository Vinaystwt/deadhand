import type { AuditEvent, AuditQuery, ReasonCode, Severity, StoryClass } from "@deadhand/types";

export function extractReasonCodes(event: AuditEvent): ReasonCode[] {
  if (Array.isArray(event.metadata.reasonCodes)) {
    return event.metadata.reasonCodes as ReasonCode[];
  }
  if (event.metadata.reasonCode) {
    return [event.metadata.reasonCode as ReasonCode];
  }
  return [];
}

export function extractSeverity(event: AuditEvent): Severity | null {
  return (event.metadata.severity as Severity | undefined) ?? null;
}

export function extractStoryClass(event: AuditEvent): StoryClass | null {
  return (event.metadata.storyClass as StoryClass | undefined) ?? null;
}

export function matchesAuditQuery(event: AuditEvent, query?: AuditQuery): boolean {
  if (!query) {
    return true;
  }

  if (query.taskId && event.taskId !== query.taskId) {
    return false;
  }
  if (query.actionId && event.actionId !== query.actionId) {
    return false;
  }
  if (query.eventType && event.eventType !== query.eventType) {
    return false;
  }
  if (query.reasonCode && !extractReasonCodes(event).includes(query.reasonCode)) {
    return false;
  }
  if (query.severity && extractSeverity(event) !== query.severity) {
    return false;
  }
  if (query.storyClass && extractStoryClass(event) !== query.storyClass) {
    return false;
  }
  if (query.startDate && new Date(event.timestamp ?? 0).getTime() < new Date(query.startDate).getTime()) {
    return false;
  }
  if (query.endDate && new Date(event.timestamp ?? 0).getTime() > new Date(query.endDate).getTime()) {
    return false;
  }

  return true;
}
