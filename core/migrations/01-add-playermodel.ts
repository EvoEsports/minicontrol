import { DataTypes } from 'sequelize';
import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().addColumn("maps", "playerModel", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    });
}

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().removeColumn("maps", "playerModel");
};