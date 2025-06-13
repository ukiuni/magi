import { LLMCommandResult } from "../llm/LLMCommandResult";
import { Tool, ToolResult, AiName } from "./ToolInterface";
import * as vscode from 'vscode';

export class GrepFilesTool implements Tool {
    name = "grepFiles";
    description = "grepFilesコマンドは、現在のワークスペース内のファイルの内容を正規表現で検索するためのツールです。args1には検索したい正規表現パターンを、args2には検索対象ディレクトリ（省略時は全体）を指定してください。";
    
    
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
                const targetDirectory = llmCommandResult.args[1] || ''; 

                
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

                
                if (targetDirectory) {
                    
                    const normalizedPath = targetDirectory.replace(/\\/g, '/').replace(/\/+/g, '/');
                    
                    
                    if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.includes(':')) {
                        resolve({
                            displayMessage: `エラー: 無効なディレクトリパスです: ${targetDirectory}`,
                            displayCommand: "showMessage",
                            result: "error",
                            resultDetail: "ワークスペース外のディレクトリや親ディレクトリへのアクセスは禁止されています。",
                            llmCommandResult: llmCommandResult 
                        });
                        return;
                    }

                    
                    try {
                        const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, normalizedPath);
                        const stat = await vscode.workspace.fs.stat(targetUri);
                        if (!(stat.type & vscode.FileType.Directory)) {
                            resolve({
                                displayMessage: `エラー: 指定されたパスはディレクトリではありません: ${targetDirectory}`,
                                displayCommand: "showMessage",
                                result: "error",
                                resultDetail: "ディレクトリパスを指定してください。",
                                llmCommandResult: llmCommandResult 
                            });
                            return;
                        }
                    } catch (error) {
                        resolve({
                            displayMessage: `エラー: 指定されたディレクトリが存在しません: ${targetDirectory}`,
                            displayCommand: "showMessage",
                            result: "error",
                            resultDetail: "存在するディレクトリパスを指定してください。",
                            llmCommandResult: llmCommandResult 
                        });
                        return;
                    }
                }

                
                let regex: RegExp;
                try {
                    regex = new RegExp(searchPattern, 'gm'); 
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

                
                const searchGlob = targetDirectory ? `${targetDirectory}/**/*` : '**/*';
                const excludePattern = targetDirectory ? `${targetDirectory}/**/node_modules/**` : '**/node_modules/**';
                
                
                const files = await vscode.workspace.findFiles(
                    searchGlob, 
                    excludePattern 
                );

                
                const searchResults: Array<{
                    filePath: string;
                    lineNumber: number;
                    lineContent: string;
                    matchedText: string;
                }> = [];

                let totalMatchCount = 0;
                let processedFileCount = 0;

                
                for (const file of files) {
                    try {
                        
                        const fileName = file.path.toLowerCase();
                        const textFileExtensions = [
                            '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.sass',
                            '.json', '.xml', '.yml', '.yaml', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
                            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.dart', '.vue', '.svelte',
                            '.sql', '.sh', '.bat', '.ps1', '.dockerfile', '.gitignore', '.env'
                        ];
                        
                        const isTextFile = textFileExtensions.some(ext => fileName.endsWith(ext)) || 
                                          !fileName.includes('.'); 
                        
                        if (!isTextFile) {
                            continue; 
                        }

                        
                        const data = await vscode.workspace.fs.readFile(file);
                        const decoder = new TextDecoder();
                        const fileContent = decoder.decode(data);
                        
                        processedFileCount++;

                        
                        const lines = fileContent.split('\n');
                        
                        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                            const line = lines[lineIndex];
                            const matches = line.match(regex);
                            
                            if (matches) {
                                
                                const relativePath = vscode.workspace.asRelativePath(file);
                                
                                for (const match of matches) {
                                    searchResults.push({
                                        filePath: relativePath,
                                        lineNumber: lineIndex + 1, 
                                        lineContent: line.trim(),
                                        matchedText: match
                                    });
                                    totalMatchCount++;
                                }
                            }
                        }
                    } catch (error) {
                        
                        console.log(`ファイル ${file.path} の読み取りをスキップしました: ${error}`);
                    }
                }

                
                const searchScope = targetDirectory ? `ディレクトリ '${targetDirectory}' 内の` : 'ワークスペース内の';
                const resultMessage = totalMatchCount > 0
                    ? `検索パターン '${searchPattern}' が ${searchScope}${searchResults.length} 箇所で見つかりました (${processedFileCount} ファイルを検索)`
                    : `検索パターン '${searchPattern}' にマッチする内容は${searchScope}見つかりませんでした (${processedFileCount} ファイルを検索)`;

                
                let resultDetail = resultMessage;
                
                if (searchResults.length > 0) {
                    resultDetail += '\n\n検索結果:\n';
                    
                    
                    const displayResults = searchResults.slice(0, 50);
                    
                    for (const result of displayResults) {
                        resultDetail += `\n📄 ${result.filePath}:${result.lineNumber}\n`;
                        resultDetail += `   ${result.lineContent}\n`;
                        resultDetail += `   ↳ マッチ: "${result.matchedText}"\n`;
                    }
                    
                    if (searchResults.length > 50) {
                        resultDetail += `\n... 他 ${searchResults.length - 50} 件の結果があります\n`;
                    }
                }

                resolve({
                    displayMessage: llmCommandResult.executionDescription,
                    displayCommand: "showMessage",
                    result: "success",
                    resultDetail: resultDetail,
                    llmCommandResult: llmCommandResult 
                });
            } catch (error) {
                
                const errorMessage = error instanceof Error ? error.message : String(error);
                resolve({
                    displayMessage: `ファイル内容検索エラー: ${errorMessage}`,
                    displayCommand: "showMessage",
                    result: "error",
                    resultDetail: `ファイル内容検索中にエラーが発生しました: ${errorMessage}`,
                    llmCommandResult: llmCommandResult 
                });
            }
        });
    }
}