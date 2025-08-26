import {
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
import Player from "./players.model";

@Table({ tableName: "scores", timestamps: true })
class Score extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column(DataType.STRING)
    mapUuid!: string;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    @HasOne(() => Player, { as: "player", sourceKey: "login", foreignKey: "login" })
    login!: string;
    player?: Player;

    @NotNull
    @AllowNull(false)
    @Column(DataType.INTEGER)
    time!: number;

    @Column(DataType.STRING)
    checkpoints!: string;

    @Column(DataType.VIRTUAL)
    rank!: number | null;
}

export default Score;
