import { HandlerCommand } from "./common";
export class UciCommand extends HandlerCommand {
  constructor(handler: UciCommand["handler"]) {
    super(handler);
  }
  getCommandString(): string {
    return "uci";
  }
}
