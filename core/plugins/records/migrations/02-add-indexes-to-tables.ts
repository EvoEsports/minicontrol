import type { Migration } from "@core/plugins/database";

export const up: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    // Adding composite index for mapUuid and login
    await queryInterface.addIndex("scores", ["mapUuid", "login"], {
        name: "idx_scores_mapUuid_login",
        unique: true,
    });

};

export const down: Migration = async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    // Removing composite index for mapUuid and login
    await queryInterface.removeIndex("scores", "idx_scores_mapUuid_login");

};
