import { Table, Column, Model, HasMany, PrimaryKey, Unique, Index, DataType, NotNull, AllowNull } from "sequelize-typescript";

@Table({ tableName: "players", timestamps: true })
class Player extends Model {
    @PrimaryKey
    @Column(DataType.STRING)
    login: string | undefined;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    nickname: string | undefined;

    @Column(DataType.STRING)
    customNick?: string | null;

    @Column(DataType.BOOLEAN)
    allowOverride?: boolean | null;

    @Column(DataType.STRING)
    zone?: string | null;

    @Column(DataType.INTEGER)
    totalPlaytime?: number | null;

    @Column(DataType.INTEGER)
    connectCount?: number | null;
}

export default Player;
