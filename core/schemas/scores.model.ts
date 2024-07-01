import { Table, Column, Model, PrimaryKey, Unique, Index, DataType, NotNull, AllowNull, HasOne, ForeignKey } from 'sequelize-typescript';
import Player from './players.model';

@Table({ tableName: "scores", timestamps: true })
class Score extends Model {
    @PrimaryKey
    @Unique
    @Column(DataType.STRING)
    mapUuid: string | undefined;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    @HasOne(() => Player, { as: "player", sourceKey: "login", foreignKey: "login" })
    login: string | undefined;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    time: number | undefined;

    @Column(DataType.STRING)
    checkpoints: string | undefined;

    @Column(DataType.VIRTUAL)
    rank: number | null = null;
}

export default Score;
