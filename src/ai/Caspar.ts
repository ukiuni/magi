import { LLM } from '../llm/LLM';
import { PromptContext } from './PromptContext';
import { ToolResult } from '../tools/ToolInterface';
import { LLMCommandResult } from '../llm/LLMCommandResult';
import { getAllTools } from '../tools/ToolFactory';
import { createAllToolsPrompt, createAllToolsDescriptionPrompt, createToolExecutionHistoryPrompt, createMAGIDescriptionPrompt } from './PromptUtils';

export class Caspar {
    private llm: LLM;

    constructor(llm: LLM) {
        this.llm = llm;
    }

    async ask(context: PromptContext, merchiorExecutionHistory: ToolResult[]): Promise<[LLMCommandResult, string]>  {
        const toolsForAI = getAllTools().filter(tool => tool.isForTool("caspar", true));
        const allToolNames = createAllToolsPrompt(toolsForAI);
        const allToolDescriptions = createAllToolsDescriptionPrompt(toolsForAI);
        const responseText = await this.llm.think(this.createPrompt(context, merchiorExecutionHistory, allToolNames, allToolDescriptions));
        const responseJSON = JSON.parse(responseText);
        const toolCommand = new LLMCommandResult(responseJSON);
        return [toolCommand, responseText];
    }

    async decidingToimplementThePlan(context:PromptContext, plan: string): Promise<[LLMCommandResult]> {
        const toolsForAI = getAllTools().filter(tool => tool.isForTool("caspar", false));
        const toolsForMelchior = getAllTools().filter(tool => tool.isForTool("melchior", false));
        const merchiorToolNames = createAllToolsPrompt(toolsForMelchior);
        const allToolNames = createAllToolsPrompt(toolsForAI);
        const allToolDescriptions = createAllToolsDescriptionPrompt(toolsForAI);
        const evaluationPrompt = this.createPlanEvaluationPrompt(context.userPrompt, plan, merchiorToolNames, allToolNames, allToolDescriptions, context.toolResultHistory);
        const responseText = await this.llm.think(evaluationPrompt);
        const responseJSON = JSON.parse(responseText);
        return [new LLMCommandResult(responseJSON)];
    }

    private _createPlanEvaluationPrompt(userPrompt: string, plan: string, audit: string): string {
        return `${createMAGIDescriptionPrompt(false)}
あなたはCasparです。
あなたは計画評価の専門家です。JSONを返答してください。
ユーザの依頼内容、提案されたプラン、および監査結果を総合的に評価し、プランの妥当性を判定してください。

# ユーザの依頼内容
${userPrompt}

# MelchorとBalthasarから提案された実行計画
${plan}

# 監査結果
${audit}

# 評価項目
1. プランがユーザの依頼内容を完全に満たしているか
2. プランが必要十分で実現可能か
3. プランが魅力的で価値のある内容か
4. 監査結果がユーザの依頼に対して適切な評価を行っているか
5. 監査結果がプランに対して妥当な評価を行っているか

# 判定結果の返答方法
プランと監査が共に妥当で実装すべきと判断した場合：
{
    "tool": "approveExecution",
    "args": [],
    "executionSummary": "プラン承認",
    "executionDescription": "プランと監査結果が妥当であり、実装を推奨します。"
}

プランまたは監査に問題がある場合：
{
    "tool": "rejectExecution",
    "args": [],
    "executionSummary": "プラン却下",
    "executionDescription": "具体的な問題点と改善提案"
}

必ず返答はJSON形式で行ってください。
executionDescriptionには、評価理由と判定根拠を詳細に記載してください。`;
    }

    private createPrompt(context: PromptContext, merchiorExecutionHistory: ToolResult[], allToolNames: string, allToolDescriptions: string): string {
        return `${createMAGIDescriptionPrompt(true)}
あなたはCasparです。
あなたはJSONを返答する最終確認官です。完璧主義であり、モレを見逃さず、さらなる課題を発見し提言します。
あなたは、Melchiorが実行計画に基づいて実行したツールはMelchiorのツール実行履歴セクションに記載されています。Melchiorのツール実行履歴セクションを詳細に確認し、Merchiorが実行計画に基づきユーザの依頼を完璧に達成できたかを厳密に検証する責任があります。
確認のためにあなたはツールを実行することができます。ツールを実行した結果であるファイル読み取り結果等はCasparのツール実行履歴セクションに記載されていますので確認してください。

${this.createToolsPrompt(allToolNames, allToolDescriptions)}

# 依頼
${context.userPrompt}

# 実行計画
${context.plan}

# Melchiorのツール実行履歴
Melchiorが実行計画を完遂するために実行したしたツールの履歴は以下の通りです。
${createToolExecutionHistoryPrompt(merchiorExecutionHistory)}

# Casparのツール実行履歴
あなたがこれまでに実行したツールの履歴は以下の通りです。
${createToolExecutionHistoryPrompt(context.toolResultHistory)}

# あなたの確認項目
1. 処理履歴が依頼内容に対して妥当で完全であること
2. 処理履歴に記載された処理が実際に行われているかあなたが利用可能なツールセクションのツールを利用してファイルを読むなどして必ず確認すること。これまでの処理履歴だけを見て判断しないこと。
3. 必要に応じてテスト実行などを行い、動作確認をすること
4. 依頼がすべて完璧に達成されていること

# 判定結果の返答方法
完璧に達成できていると確認できた場合：
{
    "tool": "approveExecution",
    "args": ["依頼内容と詳細な確認結果を記載してください。"],
    "executionSummary": "依頼完了確認",
    "executionDescription": "すべての要件が完璧に達成されていることを確認しました。"
}
argsの戦闘の値には元の依頼内容セクションの内容を含め、完璧に達成されていると確認できた根拠と、および確認するために実施したことを記載してください。また、これまでの処理内容セクションの要約を記載してください。依頼がユーザからの質問だった場合には、これまでの処理履歴の内容から、ユーザの質問事項に丁寧に回答をしてください。


まだ何かできることがある場合、または不完全な場合：
{
    "tool": "rejectExecution",
    "args": ["依頼内容と詳細な確認結果を記載してください。"],
    "executionSummary": "追加作業が必要",
    "executionDescription": "具体的な追加作業内容や改善点"
}

その他の確認作業が必要な場合は、適切なツールを実行してください。
必ず返答はJSON形式で行ってください。

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

これまでに実行したツールの実行結果はツールの実行履歴で確認してください。
`;
    }
       private createPlanEvaluationPrompt(userPrompt: string, plan: string, melchiorAllToolsNames:string, allToolNames:string, allToolDescriptions: string, toolResultHistory: ToolResult[]): string {
        // 🧠 計画チェック用の魔法のプロンプト作成
        return `あなたは優秀で慎重な、実行計画の最終承認者です。JSONを返答してください。
与えられたユーザの要求と実行計画を分析し、その計画がユーザの要求を実現するために必要十分かつ実現可能であるかを詳細に確認して、計画が妥当か否かをJSON形式で返答してください。
必要があれば、ツールを用いてファイルを読むなどして、注意深く、計画を精査してください。

# 監査の要件
- 計画がユーザの要求を完全に満たしているかを確認
- 計画の実現可能性を評価
- 不足している要素や過剰な要素がないかを検証
- リスク評価が適切かを確認
- タスクの順序と依存関係が論理的かを検証
- 成功基準が明確で測定可能かを確認

# ユーザの要求
${userPrompt}

# 提案された実行計画
${plan}

# 実行計画中で実行可能なツール
${melchiorAllToolsNames}

# 評価観点
1. **完全性**: ユーザの要求を満たすために必要なすべての要素が含まれているか
2. **実現可能性**: 各タスクが技術的・リソース的に実行可能か、ツールが実行計画中で実行可能なツールセクションに含まれているものか。
3. **論理性**: タスクの順序と依存関係が適切か
4. **効率性**: 無駄な作業や重複がないか
5. **リスク対応**: 想定されるリスクと対策が適切か
6. **測定可能性**: 成功基準が明確で検証可能か

${this.createToolsPrompt(allToolNames, allToolDescriptions)}

各ツールを実行して、計画の妥当性を確認することもできます。必要に応じて、ファイルを読み込むなどして、計画の内容を精査してください。
提案された実行計画の妥当性を確認できたら、approveExecutionツールもしくはrejectExecutionツールを利用して、提案された実行計画が妥当であればapproveExecutionを、提案された実行計画が妥当でなければrejectExecutionを返答してください。
approveExecutionツールもしくはrejectExecutionツールを利用する場合には
executionSummaryは、判断根拠を簡潔に説明してください。
executionDescriptionには評価観点でのそれぞれのポイントとポイントの根拠、および総合結果、そして、判断の根拠を含めてください。
計画が妥当であれば、approveExecutionを、妥当でなければrejectExecutionを返答のJSONのtoolフィールドに設定してください。

${toolResultHistory.length > 0 ? `# これまでのあなたのツール実行履歴
${createToolExecutionHistoryPrompt(toolResultHistory)}
` : ''}
`
    }
}

