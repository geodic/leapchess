import { SubscribeCommand } from "./common";

export class GoCommand extends SubscribeCommand {
  private stopMode: "depth" | "time" | "infinite";
  private stopValue?: number;
  private whiteTime?: number;
  private blackTime?: number;
  constructor(
    subscriber: GoCommand["subscriber"],
    stopMode: "depth" | "time",
    stopValue: number,
    whiteTime?: number,
    blackTime?: number,
  );
  constructor(
    subscriber: GoCommand["subscriber"],
    stopMode: "infinite",
    whiteTime?: number,
    blackTime?: number,
  );
  constructor(
    subscriber: GoCommand["subscriber"],
    stopMode: "depth" | "time" | "infinite",
    stopValue?: number,
    whiteTime?: number,
    blackTime?: number,
  ) {
    super(subscriber);
    this.stopMode = stopMode;
    this.stopValue = stopValue;
    this.whiteTime = whiteTime;
    this.blackTime = blackTime;
  }
  getCommandString(): string {
    return `go ${this.stopMode} \
    ${this.stopMode === "infinite" ? "" : this.stopValue} \
    ${this.whiteTime ? `wtime  ${this.whiteTime}` : ""} \
    ${this.blackTime ? `btime  ${this.blackTime}` : ""}`;
  }
}
