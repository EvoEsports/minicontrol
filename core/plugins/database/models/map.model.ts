import { Table, Column, Model, HasMany, PrimaryKey, Unique, Index, DataType, NotNull, AllowNull } from "sequelize-typescript";

@Table({ tableName: "maps", timestamps: true })
class Map extends Model {
    @PrimaryKey
    @Unique
    @Column(DataType.STRING)
    declare uuid: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare name: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare author: string;

    @Column(DataType.STRING)
    declare authorNickname: string | null;

    @NotNull
    @AllowNull(false)
    @Column(DataType.INTEGER)
    declare authorTime: number;

    @Column(DataType.STRING)
    declare environment: string | null;

    @AllowNull(true)
    @Column(DataType.STRING)
    declare playerModel: string | null;

    @AllowNull(true)
    @Column(DataType.DATE)
    declare lastPlayed: Date | null;

    @AllowNull(true)
    @Column(DataType.STRING)
    declare tmxId: string | null;
}

export default Map;
