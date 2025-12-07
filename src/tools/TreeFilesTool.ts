import { LLMCommandResult } from "../llm/LLMCommandResult.js";
import { Tool, ToolResult, AiName } from "./ToolInterface.js";
import * as vscode from 'vscode';
import * as path from 'path';

export class TreeFilesTool implements Tool {
    name = "getTreeFiles";
    description = "getTreeFilesコマンドは、現在開いているディレクトリ内のファイル一覧を階層構造で取得するツールです。args1には検索する階層の深度（数値）を指定してください。0は無制限、1は第1階層のみ、2は第2階層まで検索します。";
    
    
    isForTool(aiName: AiName): boolean {
        return true; 
    }
    
    async execute(llmCommandResult: LLMCommandResult): Promise<ToolResult> {
        try {
            const maxDepth = parseInt(llmCommandResult.args[0]) || 0; 
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            
            if (!workspaceFolder) {
                return {
                    displayMessage: "ワークスペースフォルダが開かれていません",
                    displayCommand: "showMessage",
                    result: "error",
                    resultDetail: "No workspace folder is open",
                    llmCommandResult: llmCommandResult
                };
            }

            const rootPath = workspaceFolder.uri.fsPath; 
            const fileTree = await this.buildFileTree(rootPath, maxDepth);
            
            return {
                displayMessage: `ファイルツリーを取得しました（深度: ${maxDepth === 0 ? '無制限' : maxDepth}階層）`,
                displayCommand: "showMessage",
                result: "success",
                resultDetail: this.formatFileTree(fileTree, rootPath),
                llmCommandResult: llmCommandResult
            };
        } catch (error) {
            return {
                displayMessage: "ファイルツリーの取得に失敗しました",
                displayCommand: "showMessage", 
                result: "error",
                resultDetail: error instanceof Error ? error.message : String(error),
                llmCommandResult: llmCommandResult
            };
        }
    }

    private async buildFileTree(dirPath: string, maxDepth: number, currentDepth: number = 0): Promise<FileNode[]> {
        if (maxDepth > 0 && currentDepth >= maxDepth) {
            return []; 
        }

        try {
            const uri = vscode.Uri.file(dirPath);
            const entries = await vscode.workspace.fs.readDirectory(uri);
            const nodes: FileNode[] = [];

            for (const [name, type] of entries) {
                
                if (name.startsWith('.') || name === 'node_modules') {
                    continue;
                }

                const fullPath = path.join(dirPath, name);
                const node: FileNode = {
                    name,
                    path: fullPath,
                    type: type === vscode.FileType.Directory ? 'directory' : 'file',
                    children: []
                };

                if (type === vscode.FileType.Directory) {
                    node.children = await this.buildFileTree(fullPath, maxDepth, currentDepth + 1);
                }

                nodes.push(node);
            }

            return nodes.sort((a, b) => {
                
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
            return [];
        }
    }

    private formatFileTree(nodes: FileNode[], rootPath: string, indent: string = ''): string {
        let result = '';
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const isLast = i === nodes.length - 1;
            const prefix = isLast ? '└── ' : '├── '; 
            const relativePath = path.relative(rootPath, node.path);
            
            result += `${indent}${prefix}${node.name}${node.type === 'directory' ? '/' : ''}\n`;
            
            if (node.type === 'directory' && node.children && node.children.length > 0) {
                const childIndent = indent + (isLast ? '    ' : '│   ');
                result += this.formatFileTree(node.children, rootPath, childIndent);
            }
        }
        
        return result;
    }
}

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}