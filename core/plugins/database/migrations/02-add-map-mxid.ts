import { DataTypes } from "sequelize";
import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().addColumn("maps", "tmxId", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    });
};

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().removeColumn("maps", "tmxId");
};
