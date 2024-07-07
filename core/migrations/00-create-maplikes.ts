import { DataTypes } from 'sequelize';
import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
	await sequelize.getQueryInterface().createTable('maplikes', {
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
            allowNull:false
        },
        vote: {
            type: DataTypes.FLOAT,
            allowNull: false
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
	await sequelize.getQueryInterface().dropTable('maplikes');
};