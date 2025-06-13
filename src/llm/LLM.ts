import { AiName } from "../tools/ToolInterface";

export interface LLM {
    name: AiName;
    personality: string;
    think(promptGenerator: (aiName: AiName, personality: string) => string): Promise<string>;
}