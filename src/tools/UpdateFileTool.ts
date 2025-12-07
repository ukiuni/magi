import { LLMCommandResult } from "../llm/LLMCommandResult.js";
import { Tool, ToolResult, AiName } from "./ToolInterface.js";
import * as vscode from 'vscode';

export class UpdateFileTool implements Tool {
    name = "updateFile";
    description = "updateFileコマンドは、既存ファイルの内容を更新するためのツールです。args1にはファイルパス、args2には新しいファイルの全体内容を指定してください。args2には、配置してビルドすれば成功する完全なソースコード全体を記載してください。ファイルの内容は絶対に省略しないでください。";
    
    isForTool(aiName: AiName, execution: boolean): boolean {
        return aiName === "melchior" && execution; 
    }
    
    execute(llmCommandResult: LLMCommandResult) {
        return new Promise<ToolResult>(async (resolve) => {
            try {
                
                if (!llmCommandResult.args[0]) {
                    resolve({
                        displayMessage: "エラー: ファイルパスが指定されていません",
                        displayCommand: "showMessage",
                        result: "error",
                        resultDetail: "ファイルパスを指定してください。",
                        llmCommandResult: llmCommandResult 
                    });
                    return;
                }

                if (!llmCommandResult.args[1]) {
                    resolve({
                        displayMessage: "エラー: 更新内容が指定されていません",
                        displayCommand: "showMessage",
                        result: "error",
                        resultDetail: "更新するファイル内容を指定してください。",
                        llmCommandResult: llmCommandResult 
                    });
                    return;
                }

                const filePath = llmCommandResult.args[0];
                const fileContent = llmCommandResult.args[1];

                
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    resolve({
                        displayMessage: "エラー: ワークスペースが開かれていません",
                        displayCommand: "showMessage",
                        result: "error",
                        resultDetail: "ワークスペースを開いてから再試行してください。",
                        llmCommandResult: llmCommandResult 
                    });
                    return;
                }

                
                const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
                
                
                try {
                    await vscode.workspace.fs.stat(fileUri);
                } catch (error) {
                    resolve({
                        displayMessage: `エラー: ファイル '${filePath}' が存在しません`,
                        displayCommand: "showMessage",
                        result: "error",
                        resultDetail: `指定されたパス '${filePath}' にファイルが見つかりません。`,
                        llmCommandResult: llmCommandResult 
                    });
                    return;
                }

                
                const encoder = new TextEncoder();
                const data = encoder.encode(fileContent);
                
                await vscode.workspace.fs.writeFile(fileUri, data);

                
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document);

                resolve({
                    displayMessage: llmCommandResult.executionDescription,
                    displayCommand: "showMessage" ,
                    result: "success",
                    llmCommandResult: llmCommandResult 
                });
            } catch (error) {
                
                const errorMessage = error instanceof Error ? error.message : String(error);
                resolve({
                    displayMessage: `ファイル更新エラー: ${errorMessage}`,
                    displayCommand: "showMessage",
                    result: "error",
                    resultDetail: errorMessage,
                    llmCommandResult: llmCommandResult 
                });
            }
        });
    }
}