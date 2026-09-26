import { EventEmitter } from 'events';
import { AuditService } from '../core/audit/audit.service';

export interface SystemEventPayload {
  tenantId: string;
  actorId?: string;
  eventType: string;
  data: Record<string, any>;
  timestamp: Date;
}

class SystemEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Publishes an event to all subscribers and records an audit trail
   */
  public emitEvent(event: SystemEventPayload) {
    console.log(`📡 [EventBus] Dispatched event: ${event.eventType} for tenant: ${event.tenantId}`);
    
    // Asynchronously log event trigger
    AuditService.log({
      tenantId: event.tenantId,
      userId: event.actorId,
      action: `EVENT_${event.eventType}`,
      resource: 'WorkflowEvent',
      details: event.data,
    }).catch((err) => console.error('Failed to log event audit:', err.message));

    // Emit event asynchronously
    setImmediate(() => {
      this.emit(event.eventType, event);
    });
  }
}

export const eventBus = new SystemEventBus();
