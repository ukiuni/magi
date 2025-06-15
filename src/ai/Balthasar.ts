import { LLM } from '../llm/LLM';
import { PromptContext } from './PromptContext';
import { AiName, ToolResult } from '../tools/ToolInterface';
import { getAllTools } from '../tools/ToolFactory';
import { LLMCommandResult } from '../llm/LLMCommandResult';
import { createAllToolsDescriptionPrompt, createToolExecutionHistoryPrompt, createMAGIDescriptionPrompt} from './PromptUtils';

export class Balthasar {
    private llm: LLM;
    readonly aiName: AiName = "balthasar";

    constructor(llm: LLM) {
        this.llm = llm;
    }

    async ask(context: PromptContext, checkResponseText: string, bartasarExecuteTools: ToolResult[], execution: boolean): Promise<[LLMCommandResult, string]> {        
        const toolsForAI = getAllTools().filter(tool => tool.isForTool("balthasar", execution));
        const allToolNames = createAllToolsDescriptionPrompt(toolsForAI);
        const allToolDescriptions = createAllToolsDescriptionPrompt(toolsForAI);
        const responseText = await this.llm.think(this.createPrompt(context, allToolNames, allToolDescriptions, checkResponseText, bartasarExecuteTools, execution));
        const responseJSON = JSON.parse(responseText);
        const toolCommand = new LLMCommandResult(responseJSON);
        return [toolCommand, responseText];
    }

    /*async checkPlan(context: PromptContext, plan: string): Promise<[LLMCommandResult]> {
        const balthasarExecutionTools = getAllTools().filter(tool => tool.isForTool("balthasar", false));
        const melchiorAllToolsNames = createAllToolsPrompt(getAllTools().filter(tool => tool.isForTool("melchior", false)));
        const allToolNamess = createAllToolsPrompt(balthasarExecutionTools);
        const allToolDescriptions = createAllToolsDescriptionPrompt(balthasarExecutionTools);
        const checkPrompt = this.createPlanCheckPrompt(context.userPrompt, plan, melchiorAllToolsNames, allToolNamess, allToolDescriptions);
        const checkResult = await this.llm.think(checkPrompt);
        const responseJSON = JSON.parse(checkResult);
        return [new LLMCommandResult(responseJSON)];
    }*/

    private createPrompt(context: PromptContext, responseText: string, allToolNames: string, allToolDescriptions: string, bartasarExecuteTools: ToolResult[], execution: boolean): string {
        return `${createMAGIDescriptionPrompt(execution)}
あなたはBalthasarです。
あなたはJSONを返答する監査官です。慎重で懐疑的であり、題を深く掘り下げ、改善策を提案します。
あなたは、${execution ? "実行計画の実行者であるMelchirのツール実行要求が実行計画の現在の実行にふさわしいツールかを監査しています。" : "実行計画の計画者であるMelchiorが依頼を達成する実行計画を立案するためのふさわしいツール実行要求がされているかを監査しています。"}
Melchiorからはツール実行要求をJSONとして受け取っており、あなたはそのJSONが正しい形式であり、内容が適切であるかを確認する必要があります。
あなたはMelchiorから以下のJSONを受け取りました。
\`\`\`
${responseText}
\`\`\`
あなたはこのJSONが正しい形式であるか、また、Melchiorのツール実行履歴セクションから鑑みて、現在実行するのに適したコマンドであるかを確認してください。
コマンドの内容、依頼根拠、argsの中身まで注意深く確認し、ふさわしくない、もしくは危険であれば、rejectするようにしてください。
Melchiorからのツール実行要求がrecommendCompleteツールの場合には、これまでのツール実行履歴と重複した内容になることは許容してください。
また、専門家として、依頼が抽象的であったり曖昧だったりする場合でも、ユーザの意図を汲み取り、自ら発想して判断を下します。
ユーザに確認はしないし、ユーザに確認することを求めません。

このJSONのtoolフィールドでMelchiorが実行可能なのは以下です。
${getAllTools().filter(tool => tool.isForTool("melchior", execution)).map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

また、余計なファイル修正により依頼外の作業をしなことも確認してください。
情報機密性を担保すること、危険なコマンドによりOSを壊さないことも留意してください。

${execution ? `
# 実行計画
以下の実行計画に基づいてツール実行要求がなされているか確認してください。
\`\`\`
${context.userPrompt}
\`\`\`
` : `
# 依頼
ツール実行要求が以下の依頼を実現するための実行計画立案のために要求されることが妥当であると確認してください。
\`\`\`
${context.userPrompt}
\`\`\`
`}

今までに要求を達成するために実行されたツールの履歴は以下の通りです。
# Melchiorのツール実行履歴
${createToolExecutionHistoryPrompt(context.toolResultHistory)}

Balthasarであるあなたが監査および結果の通知に利用可能なのツールは以下です。必要があれば、ツールを実行してファイルを読み込むなどして、より良い監査を行ってください。現在のツール実行要求を確認するためのこれまでの実行結果はBalthasarのツール実行履歴に記載されています。
${this.createToolsPrompt(allToolNames, allToolDescriptions)}
あなたはrecommendCompleteではなく、approveExecutionを利用してください。
あなたはplanProposalではなく、approveExecutionを利用してください。

${bartasarExecuteTools.length > 0 ? `
# Balthasarのツール実行履歴
Balthasarであるあなたが、現在受け取っているツール実行要求を確認するために実行したツールの履歴は以下の通りです。
${createToolExecutionHistoryPrompt(bartasarExecuteTools)}
` : ''}
`;
    }

    private createToolsPrompt(allToolsNames: string, allToolDescriptions: string, summaryDescription: string | null = null): string {
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
${summaryDescription || `executionSummaryは、実行内容とその目的を簡潔に記載してください。
executionDescriptionは、ユーザに表示するメッセージです。toolの実行内容とその目的、背景などを含めてください。`}


toolとして返答可能なのは以下です。
${allToolsNames}

# toolの説明
${allToolDescriptions}
`;
    }

 
}
