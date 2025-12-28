import { EventBus } from "./events/event-bus"
import { InMemoryAchievementStorage, SequelizeAchievementStorage } from "./engine/storage"
import { AchievementEngine, type AchievementProgressCallback, type AchievementUnlockedCallback } from "./engine/achievements"

import Plugin from "@core/plugins"
import type { AchievementDefinition, AchievementProgress, EventCountProgress, TierProgress } from "./engine/types"
import type { Player } from "@core/playermanager"
import ListWindow from "@core/ui/listwindow"

export type UnlockedCallback = (login: string, achievement: AchievementDefinition, tier: TierProgress) => Promise<void>
export type ProgressCallback = (login: string, achievement: AchievementDefinition, tiers: TierProgress[], totalPercent: number) => Promise<void>

declare module "@core/plugins" {
    interface PluginRegistry {
        "achievements": AchievementsPlugin;
    }
}

export default class AchievementsPlugin extends Plugin {
    bus = new EventBus()
    storage = new SequelizeAchievementStorage()
    //storage = new InMemoryAchievementStorage()
    engine!: AchievementEngine;
    achievements: AchievementDefinition[] = [];
    completeCB: Record<string, UnlockedCallback> = {}
    progressCB: Record<string, ProgressCallback | undefined> = {}

    async onLoad() {

        this.addListener("TMC.PlayerDisconnect", async (player: Player) => {
            this.engine.userProgressCache.delete(player.login)
        }, this)
        this.addCommand("/achievements", this.cmdAchievements.bind(this), "List your achievements")

        this.engine = new AchievementEngine({
            storage: this.storage,
            achievements: this.achievements,
            onUnlocked: async ({ login: userId, achievement, tier }) => {
                if (this.completeCB[achievement.id]) await this.completeCB[achievement.id](userId, achievement, tier)

            },
            onProgress: async ({ login: userId, achievement, tiers, totalPercent }) => {
                if (this.progressCB[achievement.id]) await this.progressCB[achievement.id]?.(userId, achievement, tiers, totalPercent)
            }
        })
    }

    async onStart() {
        this.updateSubscriptions()
    }

    addAchievement(achievement: AchievementDefinition, completeCB: UnlockedCallback, progressCB?: ProgressCallback | undefined) {
        this.completeCB[achievement.id] = completeCB
        this.progressCB[achievement.id] = progressCB
        this.achievements.push(achievement)
    }

    async getAchievements(login: string): Promise<Map<string, AchievementProgress> | undefined> {
        return (this.engine.userProgressCache.get(login) || await this.engine.getUserProgress(login))
    }

    protected updateSubscriptions() {
        this.bus.removeAllListeners()
        // Subscribe engine once per unique event type used by conditions (including nested ones)
        const eventTypes = new Set<string>()

        const collect = (cond: any) => {
            if (!cond || !cond.kind) return
            if (cond.kind === "event_count" || cond.kind === "value_count") {
                if (cond.eventType) eventTypes.add(cond.eventType)
                return
            }
            if (cond.kind === "and" || cond.kind === "or") {
                for (const c of cond.conditions) collect(c)
            }
        }

        for (const ach of this.achievements) {
            for (const tier of ach.tiers) {
                for (const cond of tier.conditions) collect(cond)
            }
        }

        for (const eventType of eventTypes) {
            this.bus.subscribe(eventType, (event) => {
                this.engine.handleEvent(event.login, event)
            })
        }
    }

    emitEvent(type: string, login: string, payload: any) {
        this.bus.emitEvent({
            type,
            login,
            timestamp: Date.now(),
            payload,
        })
    }


    async cmdAchievements(login: string, params: string[]) {
        const res = await this.getAchievements(login)
        if (!res) {
            tmc.chat("No achievements found for user.")
            return
        }
        const window = new ListWindow(login, "Achievements")
        window.title = "Achievements"
        window.setColumns({
            achievement: { title: "Achievement", width: 40 },
            cat: { title: "Category", width: 40 },
            unlocked: { title: "Unlocked", width: 15, align: "center" },
            counters: { title: "Counters", width: 15, align: "center" },
            progress: { title: "Progress", width: 30, align: "center", type: "progressbar" },
            tier: { title: "Tier", width: 20 , align: "center" },
        })
        window.setUseTitle(true)
        const achievements = this.achievements;
        const outData: any[] = [];
        let index = 1;

        for (const achDef of achievements) {
            const progress = res.get(achDef.id);

            let addTitle = true;
            for (const atier of achDef.tiers) {
                const tier = progress?.tiers.find(t => t.tierId == atier.id);
                const title = atier.title || atier.id;
                const unlocked = tier?.unlocked ? "$0f0Yes" : "No";
                const count = (tier?.conditions[0] as EventCountProgress)?.count ?? 0;
                const counter = `${count || 0}/${atier.conditions.find(c => c.kind == "event_count")?.requiredCount || 0}`
                outData.push({
                    cat: achDef.id,
                    tier: atier.id,
                    achievement: title,
                    counters: counter,
                    unlocked: unlocked,
                    progress: tier?.progressPercent || 0
                });

                index += 1
            }
        }
        window.setItems(outData)
        await window.show()
    }

}