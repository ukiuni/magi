import { LLMCommandResult } from "../llm/LLMCommandResult.js";
import { Tool, ToolResult, AiName } from "./ToolInterface.js";
import * as vscode from 'vscode';

export class ListFilesTool implements Tool {
    name = "listFiles";
    description = "listFilesコマンドは、指定フォルダのファイル/フォルダ名一覧を取得します。args1に相対パスを指定してください（省略時はワークスペースルート）。args2で最大探索深さを整数で指定できます（省略または負の値で無制限）。";

    isForTool(aiName: AiName, execution: boolean): boolean {
        return true;
    }

    execute(llmCommandResult: LLMCommandResult) {
        return new Promise<ToolResult>(async (resolve) => {
            try {
                const requestedPath = llmCommandResult.args[0] || ".";
                const depthArg = llmCommandResult.args[1];
                let maxDepth: number | undefined;
                if (depthArg !== undefined && depthArg !== null && depthArg !== "") {
                    const parsed = Number(depthArg);
                    if (!Number.isFinite(parsed) || parsed < 0) {
                        maxDepth = undefined; // treat negative or invalid as unlimited
                    } else {
                        maxDepth = Math.floor(parsed);
                    }
                }

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

                const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, requestedPath);

                const readDirRecursive = async (uri: vscode.Uri, currentDepth: number): Promise<any> => {
                    let entries: [string, vscode.FileType][];
                    try {
                        entries = await vscode.workspace.fs.readDirectory(uri);
                    } catch (error) {
                        return { error: `Cannot read path: ${error instanceof Error ? error.message : String(error)}` };
                    }

                    const result: { files: string[]; folders: Record<string, any> } = { files: [], folders: {} };

                    for (const [name, type] of entries) {
                        if (type & vscode.FileType.Directory) {
                            if (maxDepth === undefined || currentDepth < maxDepth) {
                                const childUri = vscode.Uri.joinPath(uri, name);
                                result.folders[name] = await readDirRecursive(childUri, currentDepth + 1);
                            } else {
                                result.folders[name] = { files: [], folders: {} };
                            }
                        } else {
                            result.files.push(name);
                        }
                    }

                    result.files.sort();
                    const sortedFolders: Record<string, any> = {};
                    Object.keys(result.folders).sort().forEach(k => { sortedFolders[k] = result.folders[k]; });
                    result.folders = sortedFolders;

                    return result;
                };

                const tree = await readDirRecursive(targetUri, 0);

                const payload = {
                    path: requestedPath,
                    maxDepth: maxDepth === undefined ? "unlimited" : maxDepth,
                    tree: tree
                };

                resolve({
                    displayMessage: llmCommandResult.executionDescription || `Listed contents of ${requestedPath}`,
                    displayCommand: "showMessage",
                    result: "success",
                    resultDetail: JSON.stringify(payload, null, 2),
                    llmCommandResult: llmCommandResult
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                resolve({
                    displayMessage: `一覧取得エラー: ${errorMessage}`,
                    displayCommand: "showMessage",
                    result: "error",
                    resultDetail: `ディレクトリ一覧取得中にエラーが発生しました: ${errorMessage}`,
                    llmCommandResult: llmCommandResult
                });
            }
        });
    }
}
