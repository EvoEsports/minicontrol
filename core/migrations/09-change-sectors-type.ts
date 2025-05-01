import { DataTypes } from 'sequelize';
import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    // notice: we need to remove the index before changing the column type, and then re-add it after
    // because possible bug on sqlite composite index with different types
    await queryInterface.removeIndex('sectors', 'idx_sectors_mapUuid_login');

    await queryInterface.changeColumn("sectors", "jsonData", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]'
    });

    await queryInterface.addIndex('sectors', ['mapUuid', 'login'], {
        name: 'idx_sectors_mapUuid_login',
        unique: true
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