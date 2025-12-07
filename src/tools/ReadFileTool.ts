import { LLMCommandResult } from "../llm/LLMCommandResult.js";
import { Tool, ToolResult, AiName } from "./ToolInterface.js";
import * as vscode from 'vscode';

export class ReadFileTool implements Tool {
    name = "readFile";
    description = "readFileコマンドは、既存ファイルの内容を読み取るためのツールです。args1にはファイルパスを指定してください。";
    
    
    isForTool(aiName: AiName): boolean {
        return true; 
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

                const filePath = llmCommandResult.args[0];

                
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
                        displayCommand: "showMessage" ,
                        result: "error",
                        resultDetail: `指定されたパス '${filePath}' にファイルが見つかりません。`,
                        llmCommandResult: llmCommandResult 
                    });
                    return;
                }

                
                const data = await vscode.workspace.fs.readFile(fileUri);
                const decoder = new TextDecoder();
                const fileContent = decoder.decode(data);

                
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document);

                resolve({
                    displayMessage: llmCommandResult.executionDescription,
                    displayCommand: "showMessage",
                    result: "success",
                    resultDetail: fileContent,
                    llmCommandResult: llmCommandResult 
                });
            } catch (error) {
                
                const errorMessage = error instanceof Error ? error.message : String(error);
                resolve({
                    displayMessage: `ファイル読み取りエラー: ${errorMessage}`,
                    displayCommand: "showMessage",
                    result: "error",
                    resultDetail: `ファイルの読み取り中にエラーが発生しました: ${errorMessage}`,
                    llmCommandResult: llmCommandResult 
                });
            }
        });
    }
}