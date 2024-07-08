import { DataTypes } from 'sequelize';
import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
	await sequelize.getQueryInterface().createTable('players', {
		login: {
			type: DataTypes.STRING,
			allowNull: false,
			primaryKey: true,
		},
		nickname: {
			type: DataTypes.STRING,
			allowNull: false,
		},
        customNick: {
            type: DataTypes.STRING
        },
        allowOverride: {
            type: DataTypes.BOOLEAN
        },
        zone: {
            type:DataTypes.STRING
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
	await sequelize.getQueryInterface().dropTable('players');
};