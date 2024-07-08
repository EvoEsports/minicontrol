import { DataTypes } from 'sequelize';
import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().createTable('scores', {
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
            allowNull: false
        },
        checkpoints: {
            type: DataTypes.STRING
        },
        updatedAt: {
            type: DataTypes.DATE
        },
        createdAt:
        {
            type: DataTypes.DATE
        }
    });
};

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().dropTable('scores');
};