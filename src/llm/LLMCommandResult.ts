export class LLMCommandResult {
    tool: string;
    args: string[];
    executionSummary: string;
    executionDescription: string;

    constructor({ tool, args, executionSummary, executionDescription }: { 
        tool: string; 
        args: string[]; 
        executionSummary: string; 
        executionDescription: string 
    }) {
        this.tool = tool;
        this.args = args;
        this.executionSummary = executionSummary;
        this.executionDescription = executionDescription;
    }
}
