import type { AchievementProgress } from "./types"
import TierProgress from "../models/tierProgress.model";


export interface AchievementStorage {
    getUserProgress(login: string): Promise<Map<string, AchievementProgress>>
    saveUserProgress(login: string, progress: Map<string, AchievementProgress>): Promise<void>
}

export class SequelizeAchievementStorage implements AchievementStorage {

    constructor() {
        tmc.getPlugin("database").addModels([TierProgress])
    }

    async getUserProgress(login: string) {
        const rows = await TierProgress.findAll({ where: { login }, order: [["achievementId", "ASC"], ["tierIndex", "ASC"]] });
        const map = new Map<string, AchievementProgress>();

        for (const row of rows) {
            const achievementId = row.getDataValue("achievementId");
            if (!map.has(achievementId)) {
                map.set(achievementId, { achievementId, tiers: [] });
            }

            const tier = {
                tierId: row.getDataValue("tierId"),
                unlocked: row.getDataValue("unlocked"),
                unlockedAt: row.getDataValue("unlockedAt") ? (row.getDataValue("unlockedAt") as Date).getTime() : undefined,
                conditions: row.getDataValue("conditions") as any,
                progressPercent: row.getDataValue("progressPercent"),
            } as any;

            map.get(achievementId)!.tiers.push(tier);
        }

        return map;
    }
    async saveAchrievementProgress(login: string, achievementId: string, achProg: AchievementProgress) {
        const sequelize = TierProgress.sequelize;
        const t = sequelize ? await sequelize.transaction() : undefined;
        const existing = await TierProgress.findAll({ where: { login, achievementId }, transaction: t });
        const existingMap = new Map(existing.map(r => [r.getDataValue("tierId"), r]));

        try {
            for (let i = 0; i < achProg.tiers.length; i++) {
                const tier = achProg.tiers[i];
                const data = {
                    login,
                    achievementId,
                    tierId: tier.tierId,
                    tierIndex: i,
                    unlocked: !!tier.unlocked,
                    unlockedAt: tier.unlockedAt ? new Date(tier.unlockedAt) : null,
                    conditions: tier.conditions ?? [],
                    progressPercent: tier.progressPercent ?? 0,
                };
                await TierProgress.upsert(data, { transaction: t });
            }
            await t?.commit();
        } catch (e) {
            await t?.rollback();
            throw e;
        }
    }





    async saveUserProgress(login: string, progress: Map<string, AchievementProgress>) {
        const sequelize = TierProgress.sequelize;
        const t = sequelize ? await sequelize.transaction() : undefined;

        try {
            // For each achievement, upsert its tiers, remove tiers not present anymore
            for (const [achievementId, achProg] of progress.entries()) {
                const existing = await TierProgress.findAll({ where: { login, achievementId }, transaction: t });
                const existingMap = new Map(existing.map(r => [r.getDataValue("tierId"), r]));
                const seen = new Set<string>();

                for (let i = 0; i < achProg.tiers.length; i++) {
                    const tier = achProg.tiers[i];
                    const data = {
                        login,
                        achievementId,
                        tierId: tier.tierId,
                        tierIndex: i,
                        unlocked: !!tier.unlocked,
                        unlockedAt: tier.unlockedAt ? new Date(tier.unlockedAt) : null,
                        conditions: tier.conditions ?? [],
                        progressPercent: tier.progressPercent ?? 0,
                    };

                    await TierProgress.upsert(data, { transaction: t });
                    seen.add(tier.tierId);
                }

                // Delete tiers that are no longer present
                const toDelete = existing.filter(r => !seen.has(r.getDataValue("tierId")));
                if (toDelete.length > 0) {
                    await TierProgress.destroy({ where: { login, achievementId, tierId: toDelete.map(r => r.getDataValue("tierId")) }, transaction: t });
                }
            }

            // Remove entire achievements that are not present in provided map
            const dbAchievements = await TierProgress.findAll({ where: { login }, attributes: ["achievementId"], group: ["achievementId"], transaction: t });
            const provided = new Set(Array.from(progress.keys()));
            const toRemove = dbAchievements.map(r => r.getDataValue("achievementId")).filter((aid: string) => !provided.has(aid));
            if (toRemove.length > 0) {
                await TierProgress.destroy({ where: { login, achievementId: toRemove }, transaction: t });
            }

            await t?.commit();
        } catch (e) {
            await t?.rollback();
            throw e;
        }
    }
}

export class InMemoryAchievementStorage implements AchievementStorage {
    private data = new Map<string, Map<string, AchievementProgress>>()

    async getUserProgress(login: string) {
        if (!this.data.has(login)) {
            this.data.set(login, new Map())
        }
        return this.data.get(login)!
    }

    async saveUserProgress(login: string, progress: Map<string, AchievementProgress>) {
        this.data.set(login, progress)
    }
}
