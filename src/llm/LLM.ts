import { AiName } from "../tools/ToolInterface.js";

export interface LLM {
    think(promptGenerator: string): Promise<string>;
}