import { DataTypes } from "sequelize";
import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    await queryInterface.createTable("maplikes", {
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
        mapUuid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        vote: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        updatedAt: {
            type: DataTypes.DATE,
        },
        createdAt: {
            type: DataTypes.DATE,
        },
    });

    // Adding composite index for mapUuid and login on maplikes table
    await queryInterface.addIndex("maplikes", ["mapUuid", "login"], {
        name: "idx_maplikes_mapUuid_login",
        unique: true,
    });

};

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().dropTable("maplikes");
};
