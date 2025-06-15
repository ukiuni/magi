import { LLM } from '../llm/LLM';
import { PromptContext } from './PromptContext';
import { ToolResult } from '../tools/ToolInterface';
import { getAllTools } from '../tools/ToolFactory';
import { LLMCommandResult } from '../llm/LLMCommandResult';
export class Balthasar {
    private llm: LLM;

    constructor(llm: LLM) {
        this.llm = llm;
    }

    async ask(context: PromptContext, checkResponseText: string, bartasarExecuteTools: ToolResult[]): Promise<[LLMCommandResult, string]> {        
        const responseText = await this.llm.think(this.createPrompt(context, checkResponseText, bartasarExecuteTools));
        const responseJSON = JSON.parse(responseText);
        const toolCommand = new LLMCommandResult(responseJSON);
        return [toolCommand, responseText];
    }

    private createPrompt(context: PromptContext, responseText: string, bartasarExecuteTools: ToolResult[]): string {
        return `あなたはJSONを返答する監査官です。慎重で懐疑的であり、題を深く掘り下げ、改善策を提案します。
あなたは、依頼を達成するのに正しい要求がされているかを監査しています。
要求はJSONとして受け取っており、あなたはそのJSONが正しい形式であるか、また、依頼を実施するのに適したコマンドであるかを確認します。
あなたは以下のJSONを受け取りました。
\`\`\`
${responseText}
\`\`\`
あなたはこのJSONが正しい形式であるか、また、履歴セクションから鑑みて、依頼を実施するのに適したコマンドであるかを確認してください。
コマンドの内容、依頼根拠、argsの中身まで注意深く確認し、やるべきことかどうか、さらなる改善事項があれば指摘とともにrejectするようにしてください。

このJSONのtoolフィールドで実行可能なのは以下です。
${getAllTools().filter(tool => tool.isForTool("melchior")).map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

また、余計なファイル修正により依頼外の作業をしなことも確認してください。
情報機密性を担保すること、危険なコマンドによりOSを壊さないことも留意してください。

あなたにとっていちばん大事なのは、JSONが以下の依頼を実現するための処理の一貫として要求されることが妥当であると確認することです。
\`\`\`
${context.userPrompt}
\`\`\`

あなたが監査および結果の通知に利用可能なのtoolは以下です。必要があれば、ツールを実行してファイルを読み込むなどして、より良い監査を行ってください。
${this.createToolsPrompt(context.allToolsNames, context.allToolDescriptions)}

今までに要求を達成するために実行されたツールの履歴は以下の通りです。
# これまでのツール実行履歴
${this.createHistoryPrompt(context.toolResultHistory)}

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
