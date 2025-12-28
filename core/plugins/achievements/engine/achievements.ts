import type {
    AchievementDefinition,
    AchievementProgress,
    TierProgress,
    ConditionDefinition,
    ConditionProgress,
    DomainEvent,
} from "./types"
import type { AchievementStorage } from "./storage"
import { ConditionEngine } from "./conditions"

export type AchievementUnlockedCallback = (args: {
    login: string
    achievement: AchievementDefinition
    tier: TierProgress
}) => void

export type AchievementProgressCallback = (args: {
    login: string
    achievement: AchievementDefinition
    tiers: TierProgress[],
    totalPercent: number
}) => void

export interface AchievementEngineOptions {
    storage: AchievementStorage
    achievements: AchievementDefinition[]
    onUnlocked?: AchievementUnlockedCallback
    onProgress?: AchievementProgressCallback
}

export class AchievementEngine {
    private storage: AchievementStorage
    private achievements: AchievementDefinition[]
    private onUnlocked?: AchievementUnlockedCallback
    private onProgress?: AchievementProgressCallback

    private conditionEngine = new ConditionEngine()
    userProgressCache: Map<string, Map<string, AchievementProgress>> = new Map()

    constructor(options: AchievementEngineOptions) {
        this.storage = options.storage
        this.achievements = options.achievements
        this.onUnlocked = options.onUnlocked
        this.onProgress = options.onProgress
    }

    async getUserProgress(login: string): Promise<Map<string, AchievementProgress> | undefined> {
        if (this.userProgressCache.has(login)) {
            return this.userProgressCache.get(login);
        } else {
            const progress = await this.storage.getUserProgress(login)
            this.userProgressCache.set(login, progress)
            return progress;
        }
    }

    async handleEvent(login: string, event: DomainEvent): Promise<void> {
        const userProgress = await this.getUserProgress(login)
        if (!userProgress) return;
        let changed = false
        const outAch: AchievementProgress[] = []

        for (const def of this.achievements) {
            let achProgress = userProgress.get(def.id)
            let achChanged = false
            let achPercent = 0

            if (!achProgress) {
                achProgress = {
                    achievementId: def.id,
                    tiers: def.tiers.map(t => ({
                        tierId: t.id,
                        unlocked: false,
                        conditions: [],
                        progressPercent: 0,
                    })),
                }
            }

            for (let i = 0; i < def.tiers.length; i++) {
                const tierDef = def.tiers[i]
                const tierProg = achProgress.tiers[i]

                if (tierProg.unlocked) continue

                const updatedConditions: ConditionProgress[] = []
                let allSatisfied = true
                let progressSum = 0

                for (let c = 0; c < tierDef.conditions.length; c++) {
                    const condDef = tierDef.conditions[c]
                    const condProg = tierProg.conditions[c]

                    const result = this.conditionEngine.updateCondition(condDef, condProg, event)
                    updatedConditions.push(result.progress)

                    const pct = this.computeConditionProgressPercent(condDef, result.progress)
                    progressSum += pct

                    if (!result.satisfied) allSatisfied = false
                }

                tierProg.conditions = updatedConditions
                tierProg.progressPercent = progressSum / tierDef.conditions.length
                achPercent += tierProg.progressPercent / def.tiers.length

                if (updatedConditions.length > 0) {
                    achChanged = true
                }

                if (allSatisfied) {
                    tierProg.unlocked = true
                    tierProg.unlockedAt = Date.now()
                    changed = true

                    this.onUnlocked?.({
                        login: login,
                        achievement: def,
                        tier: tierProg,
                    })
                }
            }
            if (achChanged) {
                outAch.push(achProgress)
            }
            userProgress.set(def.id, achProgress)
        }

        for (const achProgress of outAch) {
            const def = this.achievements.find(a => a.id === achProgress.achievementId)!
            const achPercent = achProgress.tiers.reduce((sum, t) => sum + t.progressPercent, 0) / achProgress.tiers.length
            this.onProgress?.({
                login: login,
                achievement: def,
                tiers: achProgress.tiers,
                totalPercent: achPercent,
            })
        }

        if (changed) {
            await this.storage.saveUserProgress(login, userProgress)
        }
    }

    private computeConditionProgressPercent(
        def: ConditionDefinition,
        progress: ConditionProgress
    ): number {
        switch (def.kind) {
            case "event_count": {
                const p = progress as any
                return Math.min(p.count / def.requiredCount, 1)
            }
            case "value_count": {
                const p = progress as any
                return Math.min(p.value / def.requiredValue, 1)
            }
            case "and": {
                const p = progress as any
                const childPercents = def.conditions.map((childDef, i) =>
                    this.computeConditionProgressPercent(childDef, p.children[i])
                )
                return childPercents.reduce((a, b) => a + b, 0) / childPercents.length
            }
            case "or": {
                const p = progress as any
                const childPercents = def.conditions.map((childDef, i) =>
                    this.computeConditionProgressPercent(childDef, p.children[i])
                )
                return Math.max(...childPercents)
            }
        }
    }
}
