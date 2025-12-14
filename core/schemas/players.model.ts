import { Table, Column, Model, HasMany, PrimaryKey, Unique, Index, DataType, NotNull, AllowNull } from "sequelize-typescript";

@Table({ tableName: "players", timestamps: true })
class Player extends Model {
    @PrimaryKey
    @Column(DataType.STRING)
    declare login: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare nickname: string;

    @Column(DataType.STRING)
    declare customNick: string | null;

    @Column(DataType.BOOLEAN)
    declare allowOverride: boolean | null;

    @Column(DataType.STRING)
    declare zone: string | null;

    @Column(DataType.INTEGER)
    declare totalPlaytime: number | null;

    @Column(DataType.INTEGER)
    declare connectCount: number | null;
}

export default Player;
