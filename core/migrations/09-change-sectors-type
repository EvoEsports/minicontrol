import { DataTypes } from 'sequelize';
import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    await queryInterface.changeColumn("sectors", "jsonData", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]'
    });
}

export const down: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    await queryInterface.changeColumn("sectors", "jsonData", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '[]'
    });
};