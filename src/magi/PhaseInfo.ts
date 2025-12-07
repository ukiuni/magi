import { LLMCommandResult } from '../llm/LLMCommandResult.js';
import { ToolResult } from '../tools/ToolInterface.js';

export class PhaseInfo {
    execution: boolean;
    userPrompt: string;
    plan: string;
    melchiorExecutionHistory: ToolResult[];
    rejectedLLMCommandResult: LLMCommandResult | null;
    rejectReason: LLMCommandResult | null;

    constructor(params: {
        execution: boolean;
        userPrompt: string;
        plan: string;
        melchiorExecutionHistory: ToolResult[];
        rejectedLLMCommandResult: LLMCommandResult | null;
        rejectReason: LLMCommandResult | null;
    }) {
        this.execution = params.execution;
        this.userPrompt = params.userPrompt;
        this.plan = params.plan;
        this.melchiorExecutionHistory = params.melchiorExecutionHistory;
        this.rejectedLLMCommandResult = params.rejectedLLMCommandResult;
        this.rejectReason = params.rejectReason;
    }
}
