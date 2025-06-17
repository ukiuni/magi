import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { LLMCommandResult } from './llm/LLMCommandResult';
import { createTool } from './tools/ToolFactory';
import { ToolResult } from './tools/ToolInterface';
import { PromptContext } from './ai/PromptContext';
import { Melchior } from './ai/Melchior';
import { Balthasar } from './ai/Balthasar';
import { Caspar } from './ai/Caspar';
import { VSCodeLLM } from './llm/VSCodeLLM';

export function activate(context: vscode.ExtensionContext) {
	const provider = new MagiViewProvider(context.extensionUri, context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"magi.main.view",
			provider,
		),
	);
}

var llmExecutionCancelled = false; 

class MagiViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _context: vscode.ExtensionContext;

	constructor(private readonly extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
		this._context = context; 
	}

	public async resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
		};
		
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				webviewView.webview.postMessage({
					type: "requestStateRestore"
				});
			}
		});
		const mediaUri = webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "media")
		);
		webviewView.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case "promptSended": {
					try {
						llmExecutionCancelled = false;
						treatLLM(webviewView, data.text);
					} catch (error) {
						webviewView.webview.postMessage({
							type: "showMessage",
							title: "システムエラーが発生しました。",
							text: "処理中にエラーが発生しました: " + error,
							executor: "system",
							error: "error",
							saveState: true 
						});
					}
					break;
				}
				case "cancel": {
					llmExecutionCancelled = true;
					break;
				}
				case "saveState": {
					this._context.workspaceState.update('webviewMessages', data.messages);
					break;
				}
				case "requestState": {
					const savedMessages = this._context.workspaceState.get('webviewMessages', []);
					webviewView.webview.postMessage({
						type: "restoreState",
						messages: savedMessages
					});
					break;
				}
				case "openSettings": {
					try {
						const models = await loadModels();
						const defaultModel = models.find(model =>
							model.vendor === 'copilot' && model.family === 'gpt-4.1'
						);
						const defaultModelName = defaultModel ? defaultModel.name : '';
						const currentSettings = this._context.workspaceState.get('userSettings', {
							language: 'ja',
							melchiorModel: defaultModelName,
							balthasarModel: defaultModelName,
							casparModel: defaultModelName
						});
						webviewView.webview.postMessage({
							type: "showSettings",
							settings: currentSettings,
							models: models.map(model => ({
								name: model.name,
								family: model.family,
								vendor: model.vendor
							}))
						});
					} catch (error) {
						webviewView.webview.postMessage({
							type: "showMessage",
							title: "モデル取得エラーが発生しました。",
							text: "モデル一覧の取得に失敗しました: " + error,
							executor: "system",
							error: "error",
							saveState: true
						});
					}
					break;
				}
				case "saveSettings": {
					this._context.workspaceState.update('userSettings', data.settings);
					webviewView.webview.postMessage({
						type: "settingsSaved"
					});
					break;
				}
			}
		});
		try {
			const htmlUri = vscode.Uri.joinPath(this.extensionUri, "media", "webview.html");
			const htmlBytes = await vscode.workspace.fs.readFile(htmlUri);
			const decoder = new TextDecoder('utf-8');
			let htmlContent = decoder.decode(htmlBytes);

			htmlContent = htmlContent.replaceAll('%MEDIA_URI%', mediaUri.toString());
			webviewView.webview.html = htmlContent;
			setTimeout(() => {
				const savedMessages = this._context.workspaceState.get('webviewMessages', []);
				webviewView.webview.postMessage({
					type: "restoreState",
					messages: savedMessages
				});
			}, 100); 
		} catch (error) {
			console.error('HTMLファイルの読み込みエラー:', error);
		}
	}
}

async function loadModels() {
	const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4.1' });
	return models;
}

async function treatLLM(webviewView: vscode.WebviewView, userPrompt: string,
toolResultHistory: ToolResult[] = [], rejectedLLMCommandResult:
LLMCommandResult | null = null, rejectReason: LLMCommandResult | null = null)
{
	let plan: string | void = "";
	if (!llmExecutionCancelled) {
		webviewView.webview.postMessage({
			type: "showMessage",
			text: "実行計画の策定を開始します。",
			executor: "system",
			saveState: true,
			systemInfo: true
		});
		plan = await phase(false, webviewView, userPrompt, plan, toolResultHistory, rejectedLLMCommandResult, rejectReason);
	}
	if (!llmExecutionCancelled) {
		webviewView.webview.postMessage({
			type: "showMessage",
			text: "実行計画の遂行を開始します。",
			executor: "system",
			saveState: true,
			systemInfo: true
		});
		phase(true, webviewView, userPrompt, plan!, toolResultHistory, rejectedLLMCommandResult, rejectReason);
	}
}

function showCanceled(webviewView: vscode.WebviewView,) {
	webviewView.webview.postMessage({
		type: "showMessage",
		title: "ユーザによる処理キャンセルが実行されました。",
		text: "処理がキャンセルされました。",
		executor: "user",
		saveState: true
	});
}

async function phase(execution: boolean, webviewView: vscode.WebviewView,
userPrompt: string, plan: string, melchiorExecutionHistory: ToolResult[] = [],
rejectedLLMCommandResult: LLMCommandResult | null = null, rejectReason:
LLMCommandResult | null = null): Promise<string | void> {
	if(llmExecutionCancelled) {
		showCanceled(webviewView);
		return;
	}

	const melchiorLLM = new VSCodeLLM();
	const balthasarLLM = new VSCodeLLM();
	const casparLLM = new VSCodeLLM();
	const melchior = new Melchior(melchiorLLM);
	const balthasar = new Balthasar(balthasarLLM);
	const caspar = new Caspar(casparLLM);
	const context = new PromptContext({
		userPrompt,
		toolResultHistory: melchiorExecutionHistory,
		rejectedLLMCommandResult,
		rejectReason,
		plan
	});
    let melchiorCommand: LLMCommandResult;
	let melchiorResponseText: string = "";
	try {
		if(execution) {
			[melchiorCommand, melchiorResponseText] = await melchior.ask(context);
		} else {
			[melchiorCommand, melchiorResponseText] = await melchior.plan(context);
		}
	} catch (error) {
		webviewView.webview.postMessage({
			type: "showMessage",
			title: "melchiorの考察でエラーが発生しました。",
			text: "melchiorの考察に失敗しました。" + error,
			executor: "melchior",
			error: "error",
			saveState: true
		});
		rejectReason = new LLMCommandResult({
			tool: "rejectExecution",
			args: [],
			executionSummary: "melchiorの考察でエラーが発生しました。",
			executionDescription: "melchiorの考察に失敗しました。" + error
		});
		return phase(execution, webviewView, userPrompt, plan, melchiorExecutionHistory, null, rejectReason);
	}

	let bartasarApproved = false;
	let bartasarExecuteTools: ToolResult[] = [];

	webviewView.webview.postMessage({
		type: "showMessage",
		title: "melchiorが処理の実行を要求しています。",
		text: melchiorCommand.executionDescription || melchiorCommand.executionSummary,
		executor: "melchior",
		saveState: true 
	});
	while (!llmExecutionCancelled) {
		const balthasarContext = new PromptContext({
			userPrompt,
			toolResultHistory: melchiorExecutionHistory,
	    plan
		});
		let bartasaleResult: LLMCommandResult;
        rejectReason = rejectedLLMCommandResult = null;
		try{
			[bartasaleResult]= await balthasar.ask(balthasarContext, melchiorResponseText, bartasarExecuteTools, execution);
		} catch (error) {
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "balthasarの考察でエラーが発生しました。",
				text: "エラーで再走します。エラー：" + error,
				executor: "balthasar",
				error: "error",
				saveState: true 
			});
			continue;
		}
		if (bartasaleResult.tool === "rejectExecution") {
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "❌️ balthasarがmelchiorの提案を拒否しました。",
				text: bartasaleResult.executionDescription,
				executor: "balthasar",
				saveState: true 
			});
			rejectReason = bartasaleResult;
			rejectedLLMCommandResult = melchiorCommand;
			break;
		} else if (bartasaleResult.tool === "approveExecution") {
			bartasarApproved = true;
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "⭕️ balthasarがmelchiorの提案を承認しました。",
				text: bartasaleResult.executionDescription,
				executor: "balthasar",
				saveState: true 
			});
			break;
		} else {
			const balthasarTool = createTool(bartasaleResult.tool, "balthasar", execution);
			if (!balthasarTool) {
				webviewView.webview.postMessage({
					type: "showMessage",
					title: "balthasarが存在しないツールをしようとしています。",
					text: "存在しないツール:" + bartasaleResult.tool,
					executor: "balthasar",
					error: "error",
					saveState: true 
				});
				continue;
			}
			const toolResult = await balthasarTool.execute(bartasaleResult);
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "balthasarが確認作業を行っています。",
				text: toolResult.llmCommandResult.executionDescription,
				executor: "balthasar",
				saveState: true 
			});
			if (toolResult.result === "error") {
				webviewView.webview.postMessage({
					type: "showMessage",
					title: "balthasarのツール実行でエラーが発生しました。",
					text: "balthasarのツール実行に失敗しました。" + toolResult.resultDetail,
					executor: "balthasar",
					error: "error",
					saveState: true 
				});
			}
			bartasarExecuteTools.push(toolResult);
		}
	}
	if (bartasarApproved) {
		const melchiorExecuteTool = createTool(melchiorCommand.tool, "melchior", execution);
		if (!melchiorExecuteTool) {
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "melchiorが不正なコマンドを実行しようとしています。",
				text: "不正なコマンドです。",
				executor: "melchior",
				saveState: true 
			});
			rejectReason = new LLMCommandResult({
				tool: "rejectExecution",
				args: [],
				executionSummary: "melchiorが不正なコマンドを実行しようとしています。",
				executionDescription: melchiorCommand.tool + "は存在しないコマンドです。"
			});
			return phase(execution, webviewView, userPrompt, plan, melchiorExecutionHistory, rejectedLLMCommandResult, rejectReason);
		}
		const melchiorToolResult = await melchiorExecuteTool.execute(melchiorCommand);
		const isMelchiorDoClosingTool = (melchiorExecuteTool.name === "recommendComplete" && execution) || (melchiorExecuteTool.name === "planProposal" && !execution)
		if (!isMelchiorDoClosingTool) {
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "melchiorがツールを実行しています。",
				text: melchiorToolResult.displayMessage,
				executor: "melchior",
				saveState: true
			});
		}
		melchiorExecutionHistory.push(melchiorToolResult);
		if (isMelchiorDoClosingTool) {
			webviewView.webview.postMessage({
				type: "showMessage",
				title: execution ? "casparが依頼の完了確認を開始しています。" : "casparが実行計の検証を開始しています。",
				text:  execution ? "これまでの処理内容で依頼が完璧に達成できたかを詳細に確認します。" : "実行計画:\n" + melchiorToolResult.llmCommandResult.args[1],
				executor: "caspar",
				saveState: true 
			});
		    const casparExecutionHistory: ToolResult[] = [];
			const casparContext = new PromptContext({
				userPrompt,
				toolResultHistory: casparExecutionHistory,
				plan
			});
			while (!llmExecutionCancelled) {
				let casparResult: LLMCommandResult;
				try {
					if(execution){
						[casparResult] = await caspar.ask(casparContext, melchiorExecutionHistory);
					} else {
						[casparResult] = await caspar.decidingToimplementThePlan(casparContext, melchiorToolResult.llmCommandResult.args[0]);
					}
				} catch (error) {
					webviewView.webview.postMessage({
						type: "showMessage",
						title: "casparの考察でエラーが発生しました。。",
						text: "エラーが発生したため再走します。エラー：" + error,
						executor: "caspar",
						error: "error",
						saveState: true
					});
					continue;
				}
				if (casparResult.tool === "approveExecution") {
					webviewView.webview.postMessage({
						type: execution ? "complete" : "showMessage",
						title: execution ? "⭕️ casparが処理完了を確認しました。" : "⭕️ casparが実行計画を承認しました。",
						text: execution ? casparResult.args[0] : "実行計画:\n" + melchiorToolResult.llmCommandResult.args[1] + "\n\n承認根拠\n:" + casparResult.args[0],
						executor: "caspar"
					});
					return melchiorToolResult.llmCommandResult.args[0];
				} else if (casparResult.tool === "rejectExecution") {
					rejectReason = casparResult;
					webviewView.webview.postMessage({
						type: "showMessage",
						title: "↩️ casparが追加作業が必要と判断しました。",
						text: casparResult.args[0],
						executor: "caspar",
						saveState: true 
					});
					break; 
				} else {
					const casparTool = createTool(casparResult.tool, "caspar", execution);
					if (!casparTool) {
						webviewView.webview.postMessage({
							type: "showMessage",
							title: "casparが不正なコマンドを実行しようとしています。",
							text: "不正なコマンドです。",
							executor: "caspar",
							error: "error",
							saveState: true 
						});
						continue;
					}
					const casparToolResult = await casparTool.execute(casparResult);
					webviewView.webview.postMessage({
						type: "showMessage",
						title: "casparが確認作業を実行しています。",
						text: casparToolResult.displayMessage,
						executor: "caspar",
						saveState: true 
					});
					if (casparToolResult.result === "error") {
						webviewView.webview.postMessage({
							type: "showMessage",
							title: "casparの確認作業でエラーが発生しました。",
							text: "casparの確認作業に失敗しました。" + casparToolResult.resultDetail,
							executor: "caspar",
							error: "error",
							saveState: true 
						});
					}
					casparExecutionHistory.push(casparToolResult);
				}
			}
		}
	}
	return phase(execution, webviewView, userPrompt, plan, melchiorExecutionHistory, rejectedLLMCommandResult, rejectReason);
}
