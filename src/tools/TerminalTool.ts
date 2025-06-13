import { LLMCommandResult } from "../llm/LLMCommandResult";
import { Tool, ToolResult, AiName } from "./ToolInterface";
import * as vscode from 'vscode';
import * as cp from 'child_process'; 


class CommandPseudoTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>(); 
    private closeEmitter = new vscode.EventEmitter<number | void>(); 
    private output = ''; 

    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidClose?: vscode.Event<number | void> = this.closeEmitter.event;

    constructor(private command: string, private onComplete: (output: string) => void) {}

    open(): void {
        this.writeEmitter.fire(`\x1b[2K\r$ ${this.command}\r\n`);
        const process = cp.spawn(this.command, {
            shell: true,
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        });
        process.stdout.on('data', (data: Buffer) => {
            const text = data.toString();
            this.output += text; 
            this.writeEmitter.fire(text); 
        });
        process.stderr.on('data', (data: Buffer) => {
            const text = data.toString();
            this.output += text; 
            this.writeEmitter.fire(`\x1b[31m${text}\x1b[0m`); 
        });
        process.on('close', (code) => {
            this.writeEmitter.fire(`\r\n\x1b[32m[コマンド実行完了 - 終了コード: ${code}]\x1b[0m\r\n`);
            this.onComplete(this.output); 
            this.closeEmitter.fire(code || 0);
        });
        process.on('error', (error) => {
            const errorText = `エラー: ${error.message}`;
            this.output += errorText;
            this.writeEmitter.fire(`\x1b[31m${errorText}\x1b[0m\r\n`);
            this.onComplete(this.output);
            this.closeEmitter.fire(1);
        });
    }

    close(): void {
    }
}

export class TerminalTool implements Tool {
    name = "executeCommand";
    description = "executeCommandコマンドは、シェルコマンドを実行するためのツールです。args1には、実行するコマンドを含む文字列を指定してください。";

    isForTool(aiName: AiName): boolean {
        return aiName === "melchior";
    }

    execute(llmCommandResult: LLMCommandResult) {
        return new Promise<ToolResult>(resolve => {
            try {
                const command = llmCommandResult.args[0]; 
                let resultDetail = ''; 
                const activeTerminal = vscode.window.activeTerminal;
                const terminals = vscode.window.terminals;
                if (activeTerminal || terminals.length > 0) {
                    const targetTerminal = activeTerminal || terminals[0]; 
                    targetTerminal.sendText(command, true);
                    targetTerminal.show();
                    const process = cp.spawn(command, {
                        shell: true,
                        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
                    });
                    process.stdout.on('data', (data: Buffer) => {
                        resultDetail += data.toString(); 
                    });
                    process.stderr.on('data', (data: Buffer) => {
                        resultDetail += data.toString(); 
                    });
                    process.on('close', (code) => {
                        resolve({
                            displayMessage: llmCommandResult.executionDescription,
                            displayCommand: "showMessage",
                            result: "success",
                            resultDetail: resultDetail || '', 
                            llmCommandResult: llmCommandResult
                        });
                    });
                    process.on('error', (error) => {
                        resolve({
                            displayMessage: "エラー: コマンドの実行に失敗しました",
                            displayCommand: "showMessage",
                            result: "error",
                            resultDetail: `コマンド実行中にエラーが発生しました: ${error.message}`,
                            llmCommandResult: llmCommandResult
                        });
                    });
                } else {
                    const pseudoTerminal = new CommandPseudoTerminal(command, (output: string) => {
                        resultDetail = output || '(出力なし)'; 
                        resolve({
                            displayMessage: llmCommandResult.executionDescription,
                            displayCommand: "showMessage",
                            result: "success",
                            resultDetail: resultDetail, 
                            llmCommandResult: llmCommandResult
                        });
                    });
                    const terminal = vscode.window.createTerminal({
                        name: `Command Terminal`, 
                        pty: pseudoTerminal
                    });
                    terminal.show();
                }

            } catch (error) {
                resolve({
                    displayMessage: "エラー: コマンドの実行に失敗しました",
                    displayCommand: "showMessage",
                    result: "error",
                    resultDetail: `コマンド実行中にエラーが発生しました: ${error}`,
                    llmCommandResult: llmCommandResult
                });
            }
        });
    }
}