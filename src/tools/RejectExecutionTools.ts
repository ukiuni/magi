import { LLMCommandResult } from "../llm/LLMCommandResult.js"; 
import { Tool, ToolResult, AiName } from "./ToolInterface.js"; 

export class RejectExecutionTools implements Tool {
    name = "rejectExecution"; 
    description = "rejectExecutionツールは、tool実行の形式と目的、背景、手順が不適切であることを通知するためのツールです。args1には文字列で拒否の理由と改善提案をできるだけ詳細に入れてください。";

    isForTool(aiName: AiName): boolean {
        return aiName === "balthasar" || aiName === "caspar";
    }

    execute(llmCommandResult: LLMCommandResult) { 
        return new Promise<ToolResult>(resolve => {
            
            const rejectionReason = llmCommandResult.args[0];
            
            
            const rejectionMessage = this.buildRejectionMessage(rejectionReason);
            
            
            resolve({
                displayMessage: rejectionMessage, 
                displayCommand: "showMessage", 
                result: "error", 
                resultDetail: rejectionReason, 
                llmCommandResult: llmCommandResult 
            });
        });
    }

    private buildRejectionMessage(reason: string): string { 
        
        return `❌ Tool実行拒否通知\n\n` +
               `🚨 拒否理由:\n${reason}\n\n` +
               `⚠️ 現在のtool実行要求について、以下のいずれかの問題が検出されました:\n` +
               `• 📋 実行形式が不適切\n` +
               `• 🎯 目的が明確でない、または不適切\n` +
               `• 📖 背景情報が不足または不適切\n` +
               `• 🔧 実行手順が不明確または危険\n\n` +
               `✨ 適切な形式・目的・背景・手順を再検討の上、再実行をお願いします。`; 
    }
}