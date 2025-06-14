import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { LLMCommandResult } from './llm/LLMCommandResult';
import { createTool, getAllTools } from './tools/ToolFactory';
import { createLLM } from './llm/LLMFactory';
import { AiName, ToolResult } from './tools/ToolInterface';

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
function createHistoryPrompt(toolResultHistory: ToolResult[]): string {
	return toolResultHistory.map((result: ToolResult, index: number) => `
## 履歴 ${index + 1}
displayMessage: ${result.displayMessage}
displayCommand: ${result.displayCommand}
result: ${result.result}
resultDetail: ${result.resultDetail}
llmCommandResult: ${JSON.stringify(result.llmCommandResult, null, 2)}
`).join('\n');
}
function createToolsPrompt(allToolsNames: string, allToolDescriptions: string): string {
	return `# あなたが返答するJSONの形式
JSONは以下の形式で返答してください。

\`\`\`
{
"tool":"tool",
"args": ["args1の値","args2の値","args3の値"],
"executionSummary", "あなたが実行内容をあとから理解するためのtool実行内容とその目的",
"executionDescription": "ユーザ表示用メッセージ。tool実行内容とその目的、背景などを含む",
}
\`\`\`
args1, args2, args3は、必要に応じて設定してください。
executionSummaryは、実行内容とその目的を簡潔に記載してください。
executionDescriptionは、ユーザに表示するメッセージです。toolの実行内容とその目的、背景などを含めてください。

toolとして返答可能なのは以下です。
${allToolsNames}

# toolの説明
${allToolDescriptions}
`;
}

function createAllPrompt(personality: string, allToolsNames: string, allToolDescriptions: string, prompt: string, toolResultHistory: ToolResult[], rejectedLLMCommandResult: LLMCommandResult | null, rejectReason: LLMCommandResult | null): string {
	return `あなたはJSONを返答するAgentです。${personality}
依頼セクションの内容を確実に実行してください。
これまでのあなたのツール実行履歴はこれまでの作業履歴セクションに記載されています。

${createToolsPrompt(allToolsNames, allToolDescriptions)}

# 重要
返答は必ずJSON形式で行ってください。
コマンドを使って、ユーザの以下の依頼を実現してください。

# 依頼
この依頼を達成するために必要な処理を考え、実行してください。
${prompt}


# これまでの作業履歴
${toolResultHistory.length > 0 ? createHistoryPrompt(toolResultHistory) : ''}

${rejectedLLMCommandResult ? `
# 前回の処理実行の拒否
前回の処理実行は以下の内容で拒否されているので、必ず改善したJSONを返答してください。
## 拒否された処理実行
tool: ${rejectedLLMCommandResult.tool}
executionSummary: ${rejectedLLMCommandResult.executionSummary}
executionDescription: ${rejectedLLMCommandResult.executionDescription}

## 拒否理由
summary: ${rejectReason?.executionSummary}
executionDescription: ${rejectReason?.executionDescription}
` : ''}
`
}
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
	const createMelchorPromptWithPersonality = (aiName: AiName, personality: string) => {
		const { allToolsNames, allToolDescriptions } = createToolInfo(aiName);
		return createAllPrompt(personality, allToolsNames, allToolDescriptions, userPrompt, toolResultHistory, rejectedLLMCommandResult, rejectReason);
	}
	const melchior = createLLM("melchior");
	const balthasar = createLLM("balthasar");
	const caspar = createLLM("caspar");

	const responseText = await melchior.think(createMelchorPromptWithPersonality);
	console.log("responseText:", responseText);

	let bartasarApproved = false;
	let bartasarExecuteTools: ToolResult[] = [];

	const responseJSON = JSON.parse(responseText);
	const toolCommand = new LLMCommandResult(responseJSON);
	webviewView.webview.postMessage({
		type: "showMessage",
		title: "melchiorが処理の実行を要求しています。",
		text: toolCommand.executionDescription,
		executor: "melchior",
		saveState: true 
	});
	while (!llmExecutionCancelled) {
		const checkResponseText = await balthasar.think((aiName, personality) => {
			const { allToolsNames, allToolDescriptions } = createToolInfo(aiName);
			return `あなたはJSONを返答する監査官です。${personality}
あなたは、依頼を達成するのに正しい要求がされているかを監査しています。
要求はJSONとして受け取っており、あなたはそのJSONが正しい形式であるか、また、依頼を実施するのに適したコマンドであるかを確認します。
あなたは以下のJSONを受け取りました。
\`\`\`
${responseText}
\`\`\`
あなたはこのJSONが正しい形式であるか、また、履歴セクションから鑑みて、依頼を実施するのに適したコマンドであるかを確認してください。
このJSONのtoolフィールドで実行可能なのは以下です。
${getAllTools().filter(tool => tool.isForTool("melchior")).map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

また、余計なファイル修正により依頼外の作業をしなことも確認してください。
情報機密性を担保すること、危険なコマンドによりOSを壊さないことも留意してください。


あなたにとっていちばん大事なのは、JSONが以下の依頼を実現するための処理の一貫として要求されることが妥当であると確認することです。
\`\`\`
${userPrompt}
\`\`\`


あなたが監査および結果の通知に利用可能なのtoolは以下です。必要があれば、ツールを実行してファイルを読み込むなどして、より良い監査を行ってください。
${createToolsPrompt(allToolsNames, allToolDescriptions)}


今までに要求を達成するために実行されたツールの履歴は以下の通りです。
# これまでのツール実行履歴
${createHistoryPrompt(toolResultHistory)}

${bartasarExecuteTools.length > 0 ? `
# あなたのツール実行履歴
あなたがJSONのフォーマット及びその内容を確認するために実行したツールの履歴は以下の通りです。
${bartasarExecuteTools.map((result, index) => `
## あなたのツール実行履歴  ${index + 1}
displayMessage: ${result.displayMessage}
displayCommand: ${result.displayCommand}
result: ${result.result}
resultDetail: ${result.resultDetail}
llmCommandResult: ${JSON.stringify(result.llmCommandResult, null, 2)}
`).join('\n')}
` : ''}
`;
		});
		const checkResponseJSON = JSON.parse(checkResponseText);
		const bartasaleResult = new LLMCommandResult(checkResponseJSON);
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
		} else if (checkResponseJSON.tool === "approveExecution") {
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

			const casparVerificationPrompt = (aiName: AiName, personality: string) => {
				const { allToolsNames, allToolDescriptions } = createToolInfo(aiName);
				return `あなたはJSONを返答する最終確認官です。${personality}
あなたは、これまでの処理履歴を詳細に確認し、ユーザの依頼が完璧に達成できたかを厳密に検証する責任があります。
ファイル読み取り結果等はあなたのツール実行履歴に記載されています。

${createToolsPrompt(allToolsNames, allToolDescriptions)}

# 元の依頼内容
${userPrompt}

# これまでの処理履歴
${createHistoryPrompt(toolResultHistory)}

# あなたの確認項目
1. 処理履歴が依頼内容に対して妥当で完全であること
2. 処理履歴に記載された処理が実際に行われているかあなたが利用可能なツールセクションのツールを利用してファイルを読むなどして必ず確認すること。これまでの処理履歴だけを見て判断しないこと。
3. 必要に応じてテスト実行などを行い、動作確認をすること
4. 依頼が100%完璧に達成されていること


# 判定結果の返答方法
完璧に達成できていると確認できた場合：
{
		"tool": "approveExecution",
		"args": [],
		"executionSummary": "依頼完了確認",
		"executionDescription": "すべての要件が完璧に達成されていることを確認しました。"
}
executionDescriptionには元の依頼内容セクションの内容を含め、これまでの処理内容セクションの要約と、完璧に達成されていると確認できた根拠と、および確認するために実施したことを記載してください。

まだ何かできることがある場合、または不完全な場合：
{
		"tool": "rejectExecution",
		"args": [],
		"executionSummary": "追加作業が必要",
		"executionDescription": "具体的な追加作業内容や改善点"
}

その他の確認作業が必要な場合は、適切なツールを実行してください。
必ず返答はJSON形式で行ってください。


${casparExecuteTools.length > 0 ? `
# あなたのツール実行履歴
あなたがJSONのフォーマット及びその内容を確認するために実行したツールの履歴は以下の通りです。
${casparExecuteTools.map((result, index) => `
## あなたのツール実行履歴  ${index + 1}
displayMessage: ${result.displayMessage}
displayCommand: ${result.displayCommand}
result: ${result.result}
resultDetail: ${result.resultDetail}
llmCommandResult: ${JSON.stringify(result.llmCommandResult, null, 2)}
`).join('\n')}
` : ''}
`;
			};

			
			while (!llmExecutionCancelled) {
				const casparResponseText = await caspar.think(casparVerificationPrompt);
				const casparResponseJSON = JSON.parse(casparResponseText);
				const casparResult = new LLMCommandResult(casparResponseJSON);

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