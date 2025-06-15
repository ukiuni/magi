import { LLMCommandResult } from "../llm/LLMCommandResult"; 
import { Tool, ToolResult, AiName } from "./ToolInterface"; 

export class RecommendCompleteTools implements Tool {
    name = "recommendComplete"; 
    description = "recommendCompleteコマンドは、依頼が正常に完了したときに実行するツールです。args1にはこれまでの実行履歴と、完了したと考える根拠を含む文字列を指定してください。"; 

    
    isForTool(aiName: AiName, execution: boolean): boolean {
        return aiName === "melchior" && execution;
    }

    execute(llmCommandResult: LLMCommandResult) { 
        return new Promise<ToolResult>(resolve => {
            const completionEvidence = llmCommandResult.args[0] || "タスクが完了しました"; 
            const completionMessage = this.buildCompletionMessage(completionEvidence); 
            
            resolve({
                displayMessage: completionMessage, 
                displayCommand: "showMessage", 
                result: "success", 
                resultDetail: `完了根拠: ${completionEvidence}`, 
                llmCommandResult: llmCommandResult 
            });
        });
    }

    private buildCompletionMessage(evidence: string): string { 
        
        return `🎯 タスク完了提案\n\n📋 完了根拠:\n${evidence}\n\n✅ 上記の根拠に基づき、タスクの完了を提案いたします。`; 
    }
}