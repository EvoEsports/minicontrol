import { DataTypes } from 'sequelize';
import type { Migration } from '../../migrate';

export const up: Migration = async ({ context: sequelize }) => {
	await sequelize.getQueryInterface().createTable('maps', {
		uuid: {
			type: DataTypes.STRING,
			allowNull: false,
			primaryKey: true,            
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
        author: {
            type: DataTypes.STRING,
            allowNull: false
        },
        authorNickname: {
            type: DataTypes.STRING
        },
        authorTime: {
            type: DataTypes.INTEGER,
            allowNull:false
        },
        environment: {
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
	await sequelize.getQueryInterface().dropTable('maps');
};