import { MessageTool } from "./MessageTool.js";
import { TerminalTool } from "./TerminalTool.js";
import { CreateFileTool } from "./CreateFileTool.js";
import { UpdateFileTool } from "./UpdateFileTool.js";
import { ReadFileTool } from "./ReadFileTool.js";
import { ListFilesTool } from "./ListFilesTool.js";
import { TreeFilesTool } from "./TreeFilesTool.js";
import { SeekFilesTools } from "./SeekFilesTools.js";
import { GrepFilesTool } from "./GrepFilesTool.js";
import { RecommendCompleteTools } from "./RecommendCompleteTools.js";
import { ApproveExecutionTools } from "./ApproveExecutionTools.js";
import { RejectExecutionTools } from "./RejectExecutionTools.js";
import { PlanProposalTool } from "./PlanProposalTool.js"; // 計画提案の智慧
import { AiName, Tool } from "./ToolInterface.js";

const TOOL_POOL = [new MessageTool(), new TerminalTool(), new CreateFileTool(), new UpdateFileTool(), new ReadFileTool(), new ListFilesTool(), new TreeFilesTool(), new SeekFilesTools(), new GrepFilesTool(), new RecommendCompleteTools(), new ApproveExecutionTools(), new RejectExecutionTools(), new PlanProposalTool()];

export function createTool(name: string, aiName: AiName, execution: boolean): Tool | undefined {
    return TOOL_POOL.filter(tool => tool.isForTool(aiName, execution)).find(tool => tool.name === name);
}
export function getAllTools(): Tool[] {
    return TOOL_POOL;
}