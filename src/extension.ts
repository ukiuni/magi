import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { LLMCommandResult } from './llm/LLMCommandResult';
import { createTool, getAllTools } from './tools/ToolFactory';
import { AiName, ToolResult } from './tools/ToolInterface';
import { PromptContext } from './ai/PromptContext';
import { Melchior } from './ai/Melchior';
import { Balthasar } from './ai/Balthasar';
import { Caspar } from './ai/Caspar';
import { VSCodeLLM } from './llm/VSCodeLLM';

// レスポンスJSON型定義 - 三博士の知恵を統合
interface ResponseJSON {
    tool: string;
    args: string[];
    executionSummary: string;
    executionDescription: string;
}

export function activate(context: vscode.ExtensionContext) {

	const provider = new MagiViewProvider(context.extensionUri, context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"myExtension.view",
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
	/*
	models.forEach(model => {
	  console.log(`Model: ${model.name}, Family: ${model.family}, Vendor: ${model.vendor}`);
	});	
	*/
	return models;
}
// 古いプロンプト生成関数は削除され、新しいAIクラスに移動しました ✨
const createToolInfo = (aiName: AiName) => {
	const allTools = getAllTools();
	const toolsForAI = allTools.filter(tool => tool.isForTool(aiName));
	const toolNames = toolsForAI.map(tool => tool.name).join(', ');
	const toolDescriptions = toolsForAI.map(tool => `## ${tool.name}\n ${tool.description}`).join('\n\n');
	return {
		allToolsNames: toolNames,
		allToolDescriptions: toolDescriptions
	};
}
async function treatLLM(webviewView: vscode.WebviewView, userPrompt: string, toolResultHistory: ToolResult[] = [], rejectedLLMCommandResult: LLMCommandResult | null = null, rejectReason: LLMCommandResult | null = null) {
	if(llmExecutionCancelled) {
		webviewView.webview.postMessage({
			type: "showMessage",
			title: "ユーザによる処理キャンセルが実行されました。",
			text: "処理がキャンセルされました。",
			executor: "user",
			saveState: true 
		});
		return;
	}
	// 新しいAIクラスのインスタンスを作成 🎭
	const melchiorLLM = new VSCodeLLM();
	const balthasarLLM = new VSCodeLLM();
	const casparLLM = new VSCodeLLM();
	
	const melchior = new Melchior(melchiorLLM);
	const balthasar = new Balthasar(balthasarLLM);
	const caspar = new Caspar(casparLLM);

	// プロンプトコンテキストを作成 📋
	const { allToolsNames, allToolDescriptions } = createToolInfo("melchior");
	const context = new PromptContext({
		userPrompt,
		toolResultHistory,
		rejectedLLMCommandResult,
		rejectReason,
		allToolsNames,
		allToolDescriptions
	});
    let toolCommand: LLMCommandResult;
	let responseText: string = "";
	try {
		[toolCommand, responseText] = await melchior.ask(context);
	} catch (error) {
		rejectReason = new LLMCommandResult({
			tool: "rejectExecution",
			args: [],
			executionSummary: "melchiorの処理実行でエラーが発生しました。",
			executionDescription: "melchiorの処理実行に失敗しました。" + error
		});
		webviewView.webview.postMessage({
			type: "showMessage",
			title: "melchiorの処理実行でエラーが発生しました。",
			text: "melchiorの処理実行に失敗しました。" + error,
			executor: "melchior",
			error: "error",
			saveState: true
		});
		treatLLM(webviewView, userPrompt, toolResultHistory, null, rejectReason);
		return;
	}
	console.log("responseText:", responseText);

	let bartasarApproved = false;
	let bartasarExecuteTools: ToolResult[] = [];

	webviewView.webview.postMessage({
		type: "showMessage",
		title: "melchiorが処理の実行を要求しています。",
		text: toolCommand.executionDescription,
		executor: "melchior",
		saveState: true 
	});
	while (!llmExecutionCancelled) {
		// Balthasarのコンテキストを作成 🔍
		const { allToolsNames: balthasarToolNames, allToolDescriptions: balthasarToolDescriptions } = createToolInfo("balthasar");
		const balthasarContext = new PromptContext({
			userPrompt,
			toolResultHistory,
			rejectedLLMCommandResult,
			rejectReason,
			allToolsNames: balthasarToolNames,
			allToolDescriptions: balthasarToolDescriptions
		});
		
		let bartasaleResult: LLMCommandResult;
		try{
			[bartasaleResult]= await balthasar.ask(balthasarContext, responseText, bartasarExecuteTools);
		} catch (error) {
			webviewView.webview.postMessage({//TODO show message as error
				type: "showMessage",
				title: "balthasarの応答が不正なJSON形式です。",
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
				title: "❌️ balthasarがmelchiorのコマンドを拒否しました。",
				text: bartasaleResult.executionDescription,
				executor: "balthasar",
				saveState: true 
			});
			rejectReason = bartasaleResult;
			rejectedLLMCommandResult = toolCommand;
			break;
		} else if (bartasaleResult.tool === "approveExecution") {
			bartasarApproved = true;
			rejectReason = rejectedLLMCommandResult = null;
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "⭕️ balthasarがmelchiorのコマンドを承認しました。",
				text: bartasaleResult.executionDescription,
				executor: "balthasar",
				saveState: true 
			});
			break;
		} else {
			const balthasarTool = createTool(bartasaleResult.tool, "balthasar");
			if (!balthasarTool) {
				webviewView.webview.postMessage({
					type: "showMessage",
					title: "balthasarが不正なコマンドを実行しようとしています。",
					text: "不正なコマンドです。",
					executor: "balthasar",
					error: "error",
					saveState: true 
				});
				continue;
			}
			const toolResult = await balthasarTool.execute(bartasaleResult);
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "balthasarがツールを実行しています。",
				text: toolResult.displayMessage,
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
		const tool = createTool(toolCommand.tool, "melchior");
		if (!tool) {
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "melchiorが不正なコマンドを実行しようとしています。",
				text: "不正なコマンドです。",
				executor: "melchior",
				saveState: true 
			});
			return;
		}
		const toolResult = await tool.execute(toolCommand);
		const casparExecuteTools: ToolResult[] = [];
		webviewView.webview.postMessage({
			type:  "showMessage",
			title: "melchiorがツールを実行しています。",
			text: toolResult.displayMessage,
			executor: "melchior",
			saveState: true 
		});
		toolResultHistory.push(toolResult);
		if (tool.name === "recommendComplete") {
			webviewView.webview.postMessage({
				type: "showMessage",
				title: "casparが依頼の完了確認を開始しています。",
				text: "これまでの処理内容で依頼が完璧に達成できたかを詳細に確認します。",
				executor: "caspar",
				saveState: true 
			});

			// Casparのコンテキストを作成 ⚖️
			const { allToolsNames: casparToolNames, allToolDescriptions: casparToolDescriptions } = createToolInfo("caspar");
			const casparContext = new PromptContext({
				userPrompt,
				toolResultHistory,
				rejectedLLMCommandResult,
				rejectReason,
				allToolsNames: casparToolNames,
				allToolDescriptions: casparToolDescriptions
			});

			while (!llmExecutionCancelled) {
				let casparResult: LLMCommandResult;
				try {
					[casparResult] = await caspar.ask(casparContext, casparExecuteTools);
				} catch (error) {
					webviewView.webview.postMessage({
						type: "showMessage",
						title: "casparの応答が不正なJSON形式です。",
						text: "エラーで再走します。エラー：" + error,
						executor: "caspar",
						error: "error",
						saveState: true
					});
					continue;
				}
				if (casparResult.tool === "approveExecution") {
					
					webviewView.webview.postMessage({
						type: "complete",
						title: "casparが処理完了を確認しました。",
						text: casparResult.executionDescription,
						executor: "caspar"
					});
					return;
				} else if (casparResult.tool === "rejectExecution") {
					rejectReason = casparResult;
					rejectedLLMCommandResult = toolCommand;
					
					webviewView.webview.postMessage({
						type: "showMessage",
						title: "casparが追加作業が必要と判断しました。",
						text: casparResult.executionDescription,
						executor: "caspar",
						saveState: true 
					});
					
					const rejectTool = createTool("rejectExecution", "caspar");
					if (rejectTool) {
						const rejectResult = await rejectTool.execute(casparResult);
						webviewView.webview.postMessage({
							type: "showMessage",
							title: "casparがrejectExecutionツールを実行しました。",
							text: rejectResult.displayMessage,
							executor: "caspar",
							saveState: true 
						});
					}
					break; 
				} else {
					
					const casparTool = createTool(casparResult.tool, "caspar");
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
					casparExecuteTools.push(casparToolResult);
				}
			}
		}
	}

	treatLLM(webviewView, userPrompt, toolResultHistory, rejectedLLMCommandResult, rejectReason);
}