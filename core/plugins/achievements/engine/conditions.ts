import type {
    ConditionDefinition,
    ConditionProgress,
    EventCountConditionDef,
    EventCountProgress,
    CompositeProgress,
    AndConditionDef,
    OrConditionDef,
    DomainEvent,
    ValueProgress,
    ValueCountConditionDef,
} from "./types"

export interface ConditionUpdateResult {
    progress: ConditionProgress
    satisfied: boolean
}

export class ConditionEngine {
    updateCondition(
        def: ConditionDefinition,
        progress: ConditionProgress | undefined,
        event: DomainEvent
    ): ConditionUpdateResult {
        switch (def.kind) {
            case "event_count":
                return this.updateEventCount(def, progress as EventCountProgress | undefined, event)
            case "value_count":
                return this.updateValueCondition(def as ValueCountConditionDef, progress as ValueProgress, event);
            case "and":
                return this.updateAnd(def, progress as CompositeProgress | undefined, event)
            case "or":
                return this.updateOr(def, progress as CompositeProgress | undefined, event)
        }
    }

    private updateValueCondition(
        def: ValueCountConditionDef,
        progress: ValueProgress | undefined,
        event: DomainEvent
    ): ConditionUpdateResult {
        const satisfied = event.payload?.value ?? 0 >= def.requiredValue;

        return {
            progress: progress ?? { kind: "value_count", value: event.payload?.value ?? 0 },
            satisfied: satisfied,
        };
    }


    private updateEventCount(
        def: EventCountConditionDef,
        progress: EventCountProgress | undefined,
        event: DomainEvent
    ): ConditionUpdateResult {
        const current = progress ?? { kind: "event_count", count: 0 }

        if (event.type === def.eventType) {
            const nextCount = current.count + 1
            return {
                progress: { kind: "event_count", count: nextCount },
                satisfied: nextCount >= def.requiredCount,
            }
        }

        return {
            progress: current,
            satisfied: current.count >= def.requiredCount,
        }
    }

    private defaultProgressFor(def: ConditionDefinition): ConditionProgress {
        switch (def.kind) {
            case "event_count":
                return { kind: "event_count", count: 0 }
            case "value_count":
                return { kind: "value_count", value: 0 }
            case "and":
            case "or":
                return { kind: "composite", children: def.conditions.map((c) => this.defaultProgressFor(c)) }
        }
    }

    private initCompositeChildren(defs: ConditionDefinition[]): CompositeProgress {
        return {
            kind: "composite",
            children: defs.map((d) => this.defaultProgressFor(d)),
        }
    }

    private updateAnd(
        def: AndConditionDef,
        progress: CompositeProgress | undefined,
        event: DomainEvent
    ): ConditionUpdateResult {
        const current = progress ?? this.initCompositeChildren(def.conditions)

        const updatedChildren: ConditionProgress[] = []
        let allSatisfied = true

        def.conditions.forEach((childDef, index) => {
            const childProgress = current.children[index]
            const result = this.updateCondition(childDef, childProgress, event)
            updatedChildren.push(result.progress)
            if (!result.satisfied) allSatisfied = false
        })

        return {
            progress: { kind: "composite", children: updatedChildren },
            satisfied: allSatisfied,
        }
    }

    private updateOr(
        def: OrConditionDef,
        progress: CompositeProgress | undefined,
        event: DomainEvent
    ): ConditionUpdateResult {
        const current = progress ?? this.initCompositeChildren(def.conditions)

        const updatedChildren: ConditionProgress[] = []
        let anySatisfied = false

        def.conditions.forEach((childDef, index) => {
            const childProgress = current.children[index]
            const result = this.updateCondition(childDef, childProgress, event)
            updatedChildren.push(result.progress)
            if (result.satisfied) anySatisfied = true
        })

        return {
            progress: { kind: "composite", children: updatedChildren },
            satisfied: anySatisfied,
        }
    }
}
