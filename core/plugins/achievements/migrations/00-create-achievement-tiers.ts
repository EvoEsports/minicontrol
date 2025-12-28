import { DataTypes } from "sequelize";
import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    await queryInterface.createTable("achievement_tiers", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        login: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        achievementId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tierId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tierIndex: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        unlocked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        unlockedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        progressPercent: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },
        conditions: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        updatedAt: {
            type: DataTypes.DATE,
        },
        createdAt: {
            type: DataTypes.DATE,
        },
    });

    await queryInterface.addIndex("achievement_tiers", ["login", "achievementId", "tierId"], {
        name: "idx_achievement_tiers_login_achievement_tier",
        unique: true,
    });

};

export const down: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    await queryInterface.dropTable("achievement_tiers");
};
