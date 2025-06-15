import { ToolResult } from '../tools/ToolInterface';
import { LLMCommandResult } from '../llm/LLMCommandResult';

// プロンプト作成に必要な変数を含むクラス型 ✨
export class PromptContext {
    userPrompt: string; // ユーザのプロンプト 🎯
    toolResultHistory: ToolResult[]; // ツール実行履歴 📝
    rejectedLLMCommandResult: LLMCommandResult | null; // 拒否されたコマンド 🚫
    rejectReason: LLMCommandResult | null; // 拒否理由 💭
    allToolsNames: string; // 利用可能なツール名 🔧
    allToolDescriptions: string; // ツールの説明 📚

    constructor({
        userPrompt,
        toolResultHistory = [],
        rejectedLLMCommandResult = null,
        rejectReason = null,
        allToolsNames,
        allToolDescriptions
    }: {
        userPrompt: string;
        toolResultHistory?: ToolResult[];
        rejectedLLMCommandResult?: LLMCommandResult | null;
        rejectReason?: LLMCommandResult | null;
        allToolsNames: string;
        allToolDescriptions: string;
    }) {
        this.userPrompt = userPrompt; // プロンプトの設定 🌟
        this.toolResultHistory = toolResultHistory; // 履歴の設定 📋
        this.rejectedLLMCommandResult = rejectedLLMCommandResult; // 拒否コマンドの設定 ❌
        this.rejectReason = rejectReason; // 拒否理由の設定 🤔
        this.allToolsNames = allToolsNames; // ツール名の設定 🛠️
        this.allToolDescriptions = allToolDescriptions; // ツール説明の設定 📖
    }
}