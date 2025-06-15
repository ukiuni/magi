import { LLM } from '../llm/LLM';
import { PromptContext } from './PromptContext';
import { ToolResult } from '../tools/ToolInterface';
import { LLMCommandResult } from '../llm/LLMCommandResult';

export class Caspar {
    private llm: LLM;

    constructor(llm: LLM) {
        this.llm = llm;
    }

    async ask(context: PromptContext, casparExecuteTools: ToolResult[]): Promise<[LLMCommandResult, string]>  {
        const responseText = await this.llm.think(this.createPrompt(context, casparExecuteTools));
        const responseJSON = JSON.parse(responseText);
        const toolCommand = new LLMCommandResult(responseJSON);
        return [toolCommand, responseText];
    }

    private createPrompt(context: PromptContext, casparExecuteTools: ToolResult[]): string {
        return `あなたはJSONを返答する最終確認官です。完璧主義であり、モレを見逃さず、さらなる課題を発見し提言します。
あなたは、これまでの処理履歴を詳細に確認し、ユーザの依頼が完璧に達成できたかを厳密に検証する責任があります。
ファイル読み取り結果等はあなたのツール実行履歴に記載されています。

${this.createToolsPrompt(context.allToolsNames, context.allToolDescriptions)}

# 元の依頼内容
${context.userPrompt}

# これまでの処理履歴
${this.createHistoryPrompt(context.toolResultHistory)}

# あなたの確認項目
1. 処理履歴が依頼内容に対して妥当で完全であること
2. 処理履歴に記載された処理が実際に行われているかあなたが利用可能なツールセクションのツールを利用してファイルを読むなどして必ず確認すること。これまでの処理履歴だけを見て判断しないこと。
3. 必要に応じてテスト実行などを行い、動作確認をすること
4. 依頼がすべて完璧に達成されていること

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
    }

    private createToolsPrompt(allToolsNames: string, allToolDescriptions: string): string {
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

    private createHistoryPrompt(toolResultHistory: ToolResult[]): string {
        return toolResultHistory.map((result: ToolResult, index: number) => `
## 履歴 ${index + 1}
displayMessage: ${result.displayMessage}
displayCommand: ${result.displayCommand}
result: ${result.result}
resultDetail: ${result.resultDetail}
llmCommandResult: ${JSON.stringify(result.llmCommandResult, null, 2)}
`).join('\n');
    }
}
