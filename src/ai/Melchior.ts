import { LLM } from '../llm/LLM';
import { PromptContext } from './PromptContext';
import { ToolResult } from '../tools/ToolInterface';
import { LLMCommandResult } from '../llm/LLMCommandResult';

export class Melchior {
    private llm: LLM;

    constructor(llm: LLM) {
        this.llm = llm;
    }

    async ask(context: PromptContext): Promise<[LLMCommandResult, string]> {
        const responseText = await this.llm.think(this.createPrompt(context));
     	const responseJSON = JSON.parse(responseText);
	    const toolCommand = new LLMCommandResult(responseJSON);
        return [toolCommand, responseText];
    }

    private createPrompt(context: PromptContext): string {
        return `あなたはJSONを返答するAgentです。
あなたは、優秀かつ実直かつ慎重なAgentであり、ソフトウェアエンジニアリングの完全な知識を持っています。ユーザの依頼を達成するためにあらゆることの把握に努め、最善を尽くします。

依頼セクションの内容を確実に実行してください。
これまでのあなたのツール実行履歴はこれまでの作業履歴セクションに記載されています。


${this.createToolsPrompt(context.allToolsNames, context.allToolDescriptions)}

# 重要
返答は必ずJSON形式で行ってください。
コマンドを使って、ユーザの以下の依頼を実現してください。

# 依頼
この依頼を達成するために必要な処理を考え、実行してください。
${context.userPrompt}

# これまでの作業履歴
${context.toolResultHistory.length > 0 ? this.createHistoryPrompt(context.toolResultHistory) : ''}

${context.rejectReason ? `
# 前回の処理実行の拒否
前回の処理実行は以下の内容で拒否されているので、必ず改善したJSONを返答してください。
## 拒否された処理実行
${(context.rejectedLLMCommandResult) ?`
tool: ${context.rejectedLLMCommandResult.tool}
executionSummary: ${context.rejectedLLMCommandResult.executionSummary}
executionDescription: ${context.rejectedLLMCommandResult.executionDescription}
` : `正しくJSONが返答されませんでした。以下の内容を確認し、修正してください。`}
## 拒否理由
summary: ${context.rejectReason?.executionSummary}
executionDescription: ${context.rejectReason?.executionDescription}
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
