import { LLM } from '../llm/LLM.js';
import { PromptContext } from './PromptContext.js';
import { AiName } from '../tools/ToolInterface.js';
import { LLMCommandResult } from '../llm/LLMCommandResult.js';
import { getAllTools } from '../tools/ToolFactory.js';
import { createToolExecutionHistoryPrompt, createAllToolsDescriptionPrompt, createToolsPrompt, createAllToolsPrompt, createMAGIDescriptionPrompt} from './PromptUtils.js';
import { PlanProposalTool } from '../tools/PlanProposalTool.js';

export class Melchior {
    private llm: LLM;
    readonly aiName: AiName = "melchior";
    constructor(llm: LLM) {
        this.llm = llm;
    }
    async plan(context: PromptContext): Promise<[LLMCommandResult, string]> {
        const toolsForAI = getAllTools().filter(tool => tool.isForTool("balthasar", false));// Balthasarのツールを使用して計画を立てる
        toolsForAI.push(new PlanProposalTool());
        const allToolNames = createAllToolsPrompt(toolsForAI);
        const allToolDescriptions = createAllToolsDescriptionPrompt(toolsForAI);
        const planningPrompt = this.createPlanningPrompt(context, allToolNames, allToolDescriptions);
        const responseText = await this.llm.think(planningPrompt);
        const responseJSON = JSON.parse(responseText);
        const toolCommand = new LLMCommandResult(responseJSON);
        return [toolCommand, responseText];
    }

    async ask(context: PromptContext): Promise<[LLMCommandResult, string]> {
      const toolsForAI = getAllTools().filter(tool => tool.isForTool("melchior", true));
      const allToolNames = createAllToolsPrompt(toolsForAI);
      const allToolDescriptions = createAllToolsDescriptionPrompt(toolsForAI);
      const responseText = await this.llm.think(this.createPrompt(context, allToolNames, allToolDescriptions));
      const responseJSON = JSON.parse(responseText);
      const toolCommand = new LLMCommandResult(responseJSON);
      return [toolCommand, responseText];
    }

    private createPrompt(context: PromptContext, allToolsNames: string, allToolDescriptions: string): string {
        return `${createMAGIDescriptionPrompt(true)}
あなたはMelchiorです。
あなたはJSONを返答するAgentです。
あなたは、優秀かつ実直かつ慎重なAgentであり、ソフトウェアエンジニアリングの完全な知識を持っています。実行計画をするためにあらゆることの把握に努め、最善を尽くします。
また、専門家として、実行計画が抽象的であったり曖昧だったりする場合でも、疑問に対しても回答は求めません。意図を汲み取り、自ら発想して判断を下します。

実行計画のセクションの表の、進行状況カラムが空欄の一番上の行を処理してください。
これまでのあなたのツール実行履歴はこれまでの作業履歴セクションに記載されています。

${createToolsPrompt(allToolsNames, allToolDescriptions,  "melchior", true)}

# 重要
返答は必ずJSON形式で行ってください。
ツールを使って、以下の依頼を実現してください。

# 実行計画
以下の実行計画の進行状況カラムが空欄の一番上の行を処理してください。
${context.plan}

${context.toolResultHistory.length > 0 ? "# これまでの作業履歴\n" + createToolExecutionHistoryPrompt(context.toolResultHistory) : ''}

${context.rejectReason ? this.createRejectReasonPrompt(context) : ''}
`;
    }

    private createPlanningPrompt(context: PromptContext, allToolsNames: string, allToolDescriptions: string): string {
        return `${createMAGIDescriptionPrompt(true)}
あなたはMelchiorです。
あなたは優秀な実行計画立案者です。
与えられたユーザの依頼を分析し、ツールを用いて状況を把握し、それを実現するための詳細で実行可能な計画をmarkdownの表の形式で作成してください。
ファイルを読むなどのツールの実行結果はツール実行履歴セクションに記載されています。
また、専門家として、依頼が抽象的であったり曖昧だったりする場合でも、ユーザの意図を汲み取り、自ら発想して判断を下します。


# 実行計画作成の要件
- 実行計画は具体的で実行可能な手順に分解してください
- 各フェーズは明確で理解しやすいものにしてください
- 各タスクは一回のツール実行で完了するものにしてください
- リスクや考慮事項も含めてください
- 完了条件を明確にしてください

# ユーザの依頼
ユーザの依頼は以下です。
${context.userPrompt}

# 実行計画内で実行可能なツール
実行計画内で実行可能なツールは以下です。各タスクの中で1つのツールを実行し、タスクを完了するようにしてください。
${getAllTools().filter(tool => tool.isForTool("melchior", true)).map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

${createToolsPrompt(allToolsNames, allToolDescriptions, "melchior", false, "#実行計画策定中（今）に利用可能なtool\n実行計画作成中である現在、実行可能なtoolは以下です。")}

${context.toolResultHistory.length > 0 ? "# あなたのツール実行履歴\n" + createToolExecutionHistoryPrompt(context.toolResultHistory) : ''}

# 返答形式
planProposalツールのargs1で実行計画を返答してください。
必ずmarkdownの表の形式で返答し、markdownの表以外の情報は不要です。プロジェクトを成功に導く実行可能な計画を作成してください。args1の内容は必ずJSONエスケープを行ってください。
planProposalツールの実行は十分にファイルを読み、慎重に検討を重ねたあとにだけ行ってください。

${context.rejectReason ? this.createRejectReasonPrompt(context) : ''}
`;
    }
    createRejectReasonPrompt(context: PromptContext): string {
        return `
# 前回のツール実行の拒否
前回の処理実行はBalthasarから以下の内容で拒否されているので、必ず改善した内容を返答してください。同じ内容で返答することは絶対に禁止とします。
## 拒否された処理実行
${(context.rejectedLLMCommandResult) ?`
tool: ${context.rejectedLLMCommandResult.tool}
executionSummary: ${context.rejectedLLMCommandResult.executionSummary}
executionDescription: ${context.rejectedLLMCommandResult.executionDescription}
` : `正しくJSONが返答されませんでした。以下の内容を確認し、修正してください。`}
## 拒否理由
summary: ${context.rejectReason?.executionSummary}
executionDescription: ${context.rejectReason?.executionDescription}
`;
    }
}
