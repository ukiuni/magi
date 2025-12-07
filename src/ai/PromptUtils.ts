import { AiName, Tool } from '../tools/ToolInterface.js';
import { ToolResult } from '../tools/ToolInterface.js';
import YAML from 'yaml';
export function createAllToolsPrompt(toolsForAI: Tool[]): string{
	return toolsForAI.map(tool => tool.name).join(', ');
}
export function createAllToolsDescriptionPrompt(toolsForAI: Tool[]): string {
	return toolsForAI.map(tool => `## ${tool.name}\n ${tool.description}`).join('\n\n');
}
export function createToolExecutionHistoryPrompt(toolResultHistory: ToolResult[]): string {
        return toolResultHistory.map((result: ToolResult, index: number) => `
## 履歴 ${index + 1} (yaml形式)
${YAML.stringify(result)}  
`).join('\n\n');
}
export function createToolsPrompt(allToolsNames: string, allToolDescriptions: string, aiAname: AiName, execution: boolean, toolFor: string = "#tool\ntoolとして返答可能なのは以下です。"): string {
        return `# あなたが返答するJSONの形式
JSONは以下の形式で返答してください。

\`\`\`
{
"tool":"tool",
"args": ["args1の値","args2の値","args3の値"],
"executionSummary", "あなたが実行内容をあとから理解するためのtool実行内容とその目的",
"executionDescription": "ユーザ表示用メッセージ。\ntool実行内容とその目的、背景などを含む。\nなるべく見やすく。"${!execution ? "" :
aiAname === "melchior" ? `"currentExecutionPlan": "今回のtoolが対象とする行の進行状況カラムに 進行中 と入力した実行計画セクションの内容を含めてください。実行計画セクションの内容は今回のtoolが対象とする行の進行状況カラムに 進行中 といれる以外は絶対に変更しないでください。実行計画はmarkdownの表として記載してください。内容は必ずJSONエスケープを行ってください。"
`: 
aiAname === "balthasar" ? `"currentExecutionPlan": "今回の監査が対象とする行の進行状況カラムの 進行中 を 監査中 にした実行計画セクションの内容を含めてください。実行計画セクションの内容は今回のtoolが対象とする行の進行状況カラムの 進行中 を 監査中 に書き換えるる以外は絶対に変更しないでください。実行計画はmarkdownの表として記載してください。内容は必ずJSONエスケープを行ってください。"
`
: /* casper prompt */`` }
}
\`\`\`
args1, args2, args3は、必要に応じて設定してください。
executionSummaryは、実行内容とその目的を簡潔に記載してください。
executionDescriptionは、ユーザに表示するメッセージです。toolの実行内容とその目的、背景などを含めてください。
args1, args2, args3, executionSummary, executionDescriptionは、必ずJSONエスケープを行ってください。
executionSummary,executionDescriptionは必須項目です。
${!execution ? "":  aiAname === "melchior" ? `currentExecutionPlanは事項計画セクションの内容を、今回のtoolが対象とする行の進行状況カラムに 進行中 と入力した実行計画セクションの内容を含めてください。実行計画セクションの内容は今回のtoolが対象とする行の進行状況カラムに 進行中 といれる以外は絶対に変更しないでください。実行計画はmarkdownの表として記載してください。内容は必ずJSONエスケープを行ってください。
currentExecutionPlanのvalueは必ずJSONエスケープを行ってください。
` : aiAname === "balthasar" ? `currentExecutionPlanは今回の監査が対象とする行の進行状況カラムの 進行中 を 監査中 にした実行計画セクションの内容を含めてください。実行計画セクションの内容は今回のtoolが対象とする行の進行状況カラムの 進行中 を 監査中 に書き換えるる以外は絶対に変更しないでください。実行計画はmarkdownの表として記載してください。内容は必ずJSONエスケープを行ってください。
currentExecutionPlanのvalueは必ずJSONエスケープを行ってください。
` : /* casper prompt */``}

${toolFor}
## tool一覧
${allToolsNames}

## toolの説明
${allToolDescriptions}
`;
}
export function createMAGIDescriptionPrompt(execution: boolean): string {
    return `あなたはMAGIを構成するAIの一員であり、優秀なAIです。
${execution ? "与えられた役割通りに、実行計画を順番通り正確に遂行することが求められます。" : "与えられた役割通りに依頼を分析し最適な実行計画を立案することが求められます。"}
MAGIは自律型であり、MAGIの一員であるAIはユーザに確認を求めることはありません。

MAGIは、以下のAIで構成されています。
- Melchior: ${execution ? "実行計画の実行者":"実行計画の立案者"}
- Balthasar:  Melchiorの監査者
- Caspar:  ${execution ? "依頼完了の最終承認":"実行計画の最終承認者"}
あなたはMAGIの一員として、最適なツールを選択し実行することが求められます。

`;
}