import {
    Default,
    Table,
    Column,
    Model,
    PrimaryKey,
    Unique,
    Index,
    DataType,
    NotNull,
    AllowNull,
    HasOne,
    ForeignKey,
    AutoIncrement,
} from "sequelize-typescript";

@Table({ tableName: "sectors", timestamps: true })
class SectorRec extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare mapUuid: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare login: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    declare jsonData: string;
}

export default SectorRec;
