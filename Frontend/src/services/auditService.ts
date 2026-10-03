import { AuditEvent } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class AuditService {
  static async getAuditLogs(): Promise<AuditEvent[]> {
    try {
      const logs = await ApiClient.get<AuditEvent[]>('/audit');
      StorageService.updateState(prev => ({ ...prev, auditLogs: logs }));
      return logs;
    } catch {
      return StorageService.getState().auditLogs;
    }
  }

  static async logEvent(params: {
    actor: string;
    role: string;
    action: string;
    entityType: string;
    entityId: string;
    previousState?: string;
    newState?: string;
    result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  }): Promise<AuditEvent> {
    try {
      const created = await ApiClient.post<AuditEvent>('/audit', params);
      StorageService.updateState(prev => ({
        ...prev,
        auditLogs: [created, ...prev.auditLogs],
      }));
      return created;
    } catch {
      const newEvent: AuditEvent = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ...params,
      };
      StorageService.updateState(prev => ({
        ...prev,
        auditLogs: [newEvent, ...prev.auditLogs],
      }));
      return newEvent;
    }
  }
}
