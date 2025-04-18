import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    // Adding composite index for mapUuid and login
    await queryInterface.addIndex('scores', ['mapUuid', 'login'], {
        name: 'idx_scores_mapUuid_login',
        unique: true
    });

    // Adding composite index for mapUuid and login on maplikes table
    await queryInterface.addIndex('maplikes', ['mapUuid', 'login'], {
        name: 'idx_maplikes_mapUuid_login',
        unique: true
    });

    // Adding composite index for mapUuid and login on sectors table
    await queryInterface.addIndex('sectors', ['mapUuid', 'login'], {
        name: 'idx_sectors_mapUuid_login',
        unique: true
    });
};

export const down: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    // Removing composite index for mapUuid and login
    await queryInterface.removeIndex('scores', 'idx_scores_mapUuid_login');
    await queryInterface.removeIndex('maplikes', 'idx_maplikes_mapUuid_login');
    await queryInterface.removeIndex('sectors', 'idx_sectors_mapUuid_login');
};
