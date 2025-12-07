import { LLMCommandResult } from '../llm/LLMCommandResult.js';


export type AiName = "melchior" | "balthasar" | "caspar";

export interface Tool {
  name: string;
  description: string;
  execute(result: LLMCommandResult): Promise<ToolResult>;
  isForTool(aiName: AiName, execution: boolean): boolean; 
}
export interface ToolResult {
  displayMessage: string;
  displayCommand: string;
  result: "success" | "error";
  resultDetail?: string;
  llmCommandResult: LLMCommandResult;
}