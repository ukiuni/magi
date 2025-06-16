import { LLMCommandResult } from "../llm/LLMCommandResult";
import { Tool, ToolResult, AiName } from "./ToolInterface";
import * as vscode from 'vscode';

export class CreateFileTool implements Tool {
    name = "createFile";
    description = "createFileコマンドは、新しいファイルを作成するためのツールです。args1にはファイルパス、args2にはファイル全体の内容を指定してください。args2には、配置してビルドすれば成功する完全なソースコード全体を記載してください。";
    
    
    isForTool(aiName: AiName, execution: boolean = false): boolean {
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

                const filePath = llmCommandResult.args[0];
                const fileContent = llmCommandResult.args[1] || ""; 

                
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
                
                
                const dirUri = vscode.Uri.file(fileUri.path.substring(0, fileUri.path.lastIndexOf('/')));
                try {
                    await vscode.workspace.fs.createDirectory(dirUri);
                } catch (error) {
                    
                }

                
                const encoder = new TextEncoder();
                const data = encoder.encode(fileContent);
                
                await vscode.workspace.fs.writeFile(fileUri, data);

                
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document);

                resolve({
                    displayMessage: llmCommandResult.executionDescription,
                    displayCommand: "showMessage",
                    result: "success",
                    llmCommandResult: llmCommandResult 
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                resolve({
                    displayMessage: `ファイル作成エラー: ${errorMessage}`,
                    displayCommand: "showMessage" ,
                    result: "error",
                    resultDetail: errorMessage,
                    llmCommandResult: llmCommandResult 
                });
            }
        });
    }
}