import { HandlerCommand } from "./common";

export class IsReadyCommand extends HandlerCommand {
  constructor(handler: IsReadyCommand["handler"]) {
    super(handler);
  }
  getCommandString() {
    return "isready";
  }
}
