import { LLMCommandResult } from "../llm/LLMCommandResult.js";
import { Tool, ToolResult, AiName } from "./ToolInterface.js";
export class MessageTool implements Tool {
    name = "message";
    description = "messageコマンドは、ユーザーにメッセージを表示するためのツールです。args1には、表示するメッセージを文字列として入れてください。処理完了を通知するときはrecommendCompleteツールを使用してください。";
    
    
    isForTool(aiName: AiName): boolean {
        return true; 
    }
    
    execute(llmCommandResult: LLMCommandResult) {
        return new Promise<ToolResult>(resolve => {
            resolve({ displayMessage: llmCommandResult.args[0], displayCommand: "showMessage", result: "success", llmCommandResult: llmCommandResult }) 
        });
    }
}