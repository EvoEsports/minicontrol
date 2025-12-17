import { DataTypes } from "sequelize";
import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().addColumn("players", "totalPlaytime", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    });
};

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().removeColumn("players", "totalPlaytime");
};
