import { DataTypes } from "sequelize";
import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    await queryInterface.createTable("scores", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        mapUuid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        login: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        time: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        checkpoints: {
            type: DataTypes.STRING,
        },
        updatedAt: {
            type: DataTypes.DATE,
        },
        createdAt: {
            type: DataTypes.DATE,
        },
    });
    await queryInterface.addIndex("scores", ["mapUuid", "login"], {
        name: "idx_scores_mapUuid_login",
        unique: true,
    });
};
export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().dropTable("scores");
};
