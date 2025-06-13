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
import { AiName, Tool } from "./ToolInterface"; 

const TOOL_POOL = [new MessageTool(), new TerminalTool(), new CreateFileTool(), new UpdateFileTool(), new ReadFileTool(), new TreeFilesTool(), new SeekFilesTools(), new GrepFilesTool(), new RecommendCompleteTools(), new ApproveExecutionTools(), new RejectExecutionTools()]; 

export function createTool(name: string, aiName: AiName): Tool | undefined {
    return TOOL_POOL.filter(tool => tool.isForTool(aiName)).find(tool => tool.name === name);
}
export function getAllTools(): Tool[] {
    return TOOL_POOL;
}