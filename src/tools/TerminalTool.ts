import { LLMCommandResult } from "../llm/LLMCommandResult";
import { Tool, ToolResult, AiName } from "./ToolInterface";
import * as vscode from 'vscode';

export class TerminalTool implements Tool {
    name = "executeCommand";
    description = "executeCommandコマンドは、シェルコマンドを実行するためのツールです。args1には、実行するコマンドを含む文字列を指定してください。";

    
    isForTool(aiName: AiName): boolean {
        return aiName === "melchior"; 
    }

    execute(llmCommandResult: LLMCommandResult) {
        return new Promise<ToolResult>(resolve => {
            const execute = (terminal: vscode.Terminal) => {
                try {
                    terminal.sendText(llmCommandResult.args[0], true);
                    terminal.show();
                    resolve({ displayMessage: llmCommandResult.executionDescription, displayCommand: "showMessage", result: "success", llmCommandResult: llmCommandResult });

                } catch (error) {
                    resolve({
                        displayMessage: "エラー: コマンドの実行に失敗しました",
                        displayCommand: "showMessage",
                        result: "error",
                        resultDetail: `コマンド実行中にエラーが発生しました: ${error}`,
                        llmCommandResult: llmCommandResult
                    });
                    return;
                }
            };
            const activeTerminal = vscode.window.activeTerminal;
            if (activeTerminal) {
                execute(activeTerminal);
                return;
            }

            const terminals = vscode.window.terminals;
            if (terminals.length) {
                execute(terminals[0]);
            } else {
                const newTerminal = vscode.window.createTerminal();
                execute(newTerminal);
            }
        });
    }
}