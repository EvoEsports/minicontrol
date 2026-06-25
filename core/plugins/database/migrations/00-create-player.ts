import { DataTypes } from "sequelize";
import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().createTable("players", {
        login: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        nickname: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        customNick: {
            type: DataTypes.STRING,
        },
        allowOverride: {
            type: DataTypes.BOOLEAN,
        },
        totalPlaytime: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        connectCount: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        zone: {
            type: DataTypes.STRING,
        },
        updatedAt: {
            type: DataTypes.DATE,
        },
        createdAt: {
            type: DataTypes.DATE,
        },
    });
};

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().dropTable("players");
};
