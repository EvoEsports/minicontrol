// Domain event flowing through your backend
export interface DomainEvent {
    type: string
    login: string
    timestamp: number
    payload?: any
}

// ─────────────────────────────────────────────
// CONDITION DEFINITIONS
// ─────────────────────────────────────────────

export type ConditionDefinition =
    | EventCountConditionDef
    | ValueCountConditionDef
    | AndConditionDef
    | OrConditionDef

export interface EventCountConditionDef {
    kind: "event_count"
    eventType: string
    requiredCount: number
}

export interface ValueCountConditionDef {
    kind: "value_count"
    eventType: string
    requiredValue: number
}

export interface AndConditionDef {
    kind: "and"
    conditions: ConditionDefinition[]
}

export interface OrConditionDef {
    kind: "or"
    conditions: ConditionDefinition[]
}

// ─────────────────────────────────────────────
// CONDITION PROGRESS
// ─────────────────────────────────────────────

export type ConditionProgress =
    | EventCountProgress
    | ValueProgress
    | CompositeProgress

export interface EventCountProgress {
    kind: "event_count"
    count: number
}

export interface ValueProgress {
    kind: "value_count"
    value: number
}

export interface CompositeProgress {
    kind: "composite"
    children: ConditionProgress[]
}

// ─────────────────────────────────────────────
// TIERS & ACHIEVEMENTS
// ─────────────────────────────────────────────

export interface AchievementTier {
    id: string
    title: string
    description: string
    conditions: ConditionDefinition[]
    points?: number
}

export interface AchievementDefinition {
    id: string
    category: string
    tiers: AchievementTier[]
    meta?: Record<string, any>
}

export interface TierProgress {
    tierId: string
    unlocked: boolean
    unlockedAt?: number
    conditions: ConditionProgress[]
    progressPercent: number
}

export interface AchievementProgress {
    achievementId: string
    tiers: TierProgress[]
}
