import { EventEmitter } from "events"
import type { DomainEvent } from "../engine/types"

export class EventBus extends EventEmitter {
  emitEvent(event: DomainEvent) {
    this.emit(event.type, event)
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => void) {
    this.addListener(eventType, handler)
  }
}
