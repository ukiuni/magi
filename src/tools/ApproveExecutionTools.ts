import { LLMCommandResult } from "../llm/LLMCommandResult"; 
import { Tool, ToolResult, AiName } from "./ToolInterface"; 

export class ApproveExecutionTools implements Tool {
    name = "approveExecution"; 
    description = "approveExecutionツールは、tool実行の形式と目的、背景、手順が妥当であることを通知するためのツールです。args1には文字列で判断の根拠を入れてください。";

    
    isForTool(aiName: AiName): boolean {
        return aiName === "balthasar" || aiName === "caspar";
    }

    execute(llmCommandResult: LLMCommandResult) { 
        return new Promise<ToolResult>(resolve => {
            
            const evidence = llmCommandResult.args[0];
            
            
            
            resolve({
                displayMessage: evidence, 
                displayCommand: "showMessage", 
                result: "success", 
                llmCommandResult: llmCommandResult 
            });
        });
    }

    private buildApprovalMessage(format: string, purpose: string, background: string, procedure: string): string { 
        
        return `✅ Tool実行承認通知\n\n` +
               `📋 実行形式:\n${format}\n\n` +
               `🎯 目的:\n${purpose}\n\n` +
               `📖 背景:\n${background}\n\n` +
               `🔧 手順:\n${procedure}\n\n` +
               `✨ 上記の内容について、形式・目的・背景・手順が妥当であることを確認し、実行を承認いたします。`; 
    }
}