import { DataTypes } from "sequelize";
import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    await queryInterface.createTable("personalbest", {
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
        avgTime: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        finishCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        updatedAt: {
            type: DataTypes.DATE,
        },
        createdAt: {
            type: DataTypes.DATE,
        },
    });
    // Adding composite index for mapUuid and login
    await queryInterface.addIndex("personalbest", ["mapUuid", "login"], {
        name: "idx_personalbest_mapUuid_login",
        unique: true,
    });

    // // fill the table with data from scores table
    // console.log("Filling personalbest table with data from scores table...");
    // console.log("This may take a while...");
    // await queryInterface.sequelize.query(`
    //     INSERT INTO personalbest (mapUuid, login, time, checkpoints, avgTime, finishCount, createdAt, updatedAt)
    //     SELECT mapUuid, login, time, checkpoints, time, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    //     FROM scores
    // `);
    // console.log("Done.");
};

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().dropTable("personalbest");
};
