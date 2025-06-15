import { MessageTool } from "./MessageTool";
import { TerminalTool } from "./TerminalTool";
import { CreateFileTool } from "./CreateFileTool";
import { UpdateFileTool } from "./UpdateFileTool";
import { ReadFileTool } from "./ReadFileTool";
import { TreeFilesTool } from "./TreeFilesTool";
import { SeekFilesTools } from "./SeekFilesTools";
import { GrepFilesTool } from "./GrepFilesTool";
import { RecommendCompleteTools } from "./RecommendCompleteTools";
import { ApproveExecutionTools } from "./ApproveExecutionTools";
import { RejectExecutionTools } from "./RejectExecutionTools";
import { PlanProposalTool } from "./PlanProposalTool"; // 計画提案の智慧
import { AiName, Tool } from "./ToolInterface";

const TOOL_POOL = [new MessageTool(), new TerminalTool(), new CreateFileTool(), new UpdateFileTool(), new ReadFileTool(), new TreeFilesTool(), new SeekFilesTools(), new GrepFilesTool(), new RecommendCompleteTools(), new ApproveExecutionTools(), new RejectExecutionTools(), new PlanProposalTool()]; // 計画立案ツールの追加

export function createTool(name: string, aiName: AiName, execution: boolean): Tool | undefined {
    return TOOL_POOL.filter(tool => tool.isForTool(aiName, execution)).find(tool => tool.name === name);
}
export function getAllTools(): Tool[] {
    return TOOL_POOL;
}