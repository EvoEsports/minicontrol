import { DataTypes } from 'sequelize';
import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().addColumn("maps", "lastPlayed", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    });
}

export const down: Migration = async ({ context: sequelize }) => {
    await sequelize.getQueryInterface().removeColumn("maps", "lastPlayed");
};