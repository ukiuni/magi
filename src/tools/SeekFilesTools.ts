import { LLMCommandResult } from "../llm/LLMCommandResult";
import { Tool, ToolResult, AiName } from "./ToolInterface";
import * as vscode from 'vscode';

export class SeekFilesTools implements Tool {
    name = "seekFiles";
    description = "seekFilesコマンドは、現在のワークスペース内のファイルを正規表現でファイル名検索するためのツールです。args1には検索したい正規表現パターンを指定してください。";
    
    
    isForTool(aiName: AiName): boolean {
        return true; 
    }
    
    execute(llmCommandResult: LLMCommandResult) {
        return new Promise<ToolResult>(async (resolve) => {
            try {
                if (!llmCommandResult.args[0]) {
                    resolve({
                        displayMessage: "エラー: 検索パターンが指定されていません",
                        displayCommand: "showMessage",
                        result: "error",
                        resultDetail: "正規表現パターンを指定してください。",
                        llmCommandResult: llmCommandResult 
                    });
                    return;
                }

                const searchPattern = llmCommandResult.args[0];

                
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

                
                let regex: RegExp;
                try {
                    regex = new RegExp(searchPattern, 'i'); 
                } catch (error) {
                    resolve({
                        displayMessage: `エラー: 無効な正規表現パターンです: ${searchPattern}`,
                        displayCommand: "showMessage",
                        result: "error",
                        resultDetail: `正規表現が無効です: ${error instanceof Error ? error.message : String(error)}`,
                        llmCommandResult: llmCommandResult 
                    });
                    return;
                }

                
                const files = await vscode.workspace.findFiles(
                    '**/*', 
                    '**/node_modules/**' 
                );

                
                const matchedFiles: string[] = [];
                for (const file of files) {
                    const fileName = file.path.split('/').pop() || ''; 
                    const relativePath = vscode.workspace.asRelativePath(file); 

                    if (regex.test(fileName)) {
                        matchedFiles.push(relativePath); 
                    }
                }

                
                const resultCount = matchedFiles.length;
                const resultMessage = resultCount > 0 
                    ? `検索パターン '${searchPattern}' にマッチするファイルが ${resultCount} 件見つかりました`
                    : `検索パターン '${searchPattern}' にマッチするファイルは見つかりませんでした`;

                
                const fileList = matchedFiles.length > 0 
                    ? '\n\nマッチしたファイル:\n' + matchedFiles.map(file => `• ${file}`).join('\n')
                    : '';

                resolve({
                    displayMessage: llmCommandResult.executionDescription,
                    displayCommand: "showMessage",
                    result: "success",
                    resultDetail: resultMessage + fileList,
                    llmCommandResult: llmCommandResult 
                });
            } catch (error) {
                
                const errorMessage = error instanceof Error ? error.message : String(error);
                resolve({
                    displayMessage: `ファイル検索エラー: ${errorMessage}`,
                    displayCommand: "showMessage",
                    result: "error",
                    resultDetail: `ファイル検索中にエラーが発生しました: ${errorMessage}`,
                    llmCommandResult: llmCommandResult 
                });
            }
        });
    }
}