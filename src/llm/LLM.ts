import { AiName } from "../tools/ToolInterface";

export interface LLM {
    think(promptGenerator: string): Promise<string>;
}