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
    id: number | undefined;

    @Column(DataType.STRING)
    mapUuid: string | undefined;

    @NotNull
    @AllowNull(false)
    @Column(DataType.STRING)
    @HasOne(() => Player, { as: "player", sourceKey: "login", foreignKey: "login" })
    login: string | undefined;
    player?: Player;

    @NotNull
    @AllowNull(false)
    @Column(DataType.INTEGER)
    time: number | undefined;

    @Column(DataType.STRING)
    checkpoints: string | undefined;

    @Column(DataType.VIRTUAL)
    rank: number | null = null;
}

export default Score;
