import { DataTypes } from "sequelize";
import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    await queryInterface.createTable("sectors", {
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
        jsonData: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: "[]",
        },
        updatedAt: {
            type: DataTypes.DATE,
        },
        createdAt: {
            type: DataTypes.DATE,
        },
    });
    await queryInterface.addIndex("sectors", ["mapUuid", "login"], {
        name: "idx_sectors_mapUuid_login",
        unique: true,
    });
};

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().dropTable("sectors");
};
