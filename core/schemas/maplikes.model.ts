import {
    Table,
    Column,
    Model,
    HasMany,
    PrimaryKey,
    Unique,
    Index,
    DataType,
    NotNull,
    BelongsTo,
    HasOne,
    AllowNull,
    AutoIncrement,
} from "sequelize-typescript";

@Table({ tableName: "maplikes", timestamps: true })
class MapLikes extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    mapUuid!: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    login!: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.FLOAT)
    vote!: number;
}

export default MapLikes;
