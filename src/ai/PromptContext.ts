import { ToolResult } from '../tools/ToolInterface';
import { LLMCommandResult } from '../llm/LLMCommandResult';

export class PromptContext {
    userPrompt: string;
    toolResultHistory: ToolResult[];
    rejectedLLMCommandResult: LLMCommandResult | null;
    rejectReason: LLMCommandResult | null
    plan: string;

    constructor({
        userPrompt,
        toolResultHistory = [],
        rejectedLLMCommandResult = null,
        rejectReason = null,
        plan,
    }: {
        userPrompt: string;
        toolResultHistory?: ToolResult[];
        rejectedLLMCommandResult?: LLMCommandResult | null;
        rejectReason?: LLMCommandResult | null;
        plan: string;
    }) {
        this.userPrompt = userPrompt;
        this.toolResultHistory = toolResultHistory;
        this.rejectedLLMCommandResult = rejectedLLMCommandResult;
        this.rejectReason = rejectReason;
        this.plan = plan;
    }
}