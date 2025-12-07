import { LLMCommandResult } from "../llm/LLMCommandResult.js"; // 魔法の橋渡し
import { Tool, ToolResult, AiName } from "./ToolInterface.js"; // 契約の定義書
const planMarkdownTable = `
`;
export class PlanProposalTool implements Tool {
    name = "planProposal"; // 計画立案の名前
    description = `planProposalツールは、プロジェクトを成功に導く実行可能な計画をmarkdownの表の形式で提案するツールです。
args1にはmarkdownの表の形式の実行計画を入れてください。実行計画のフォーマットは以下とします。
| タスク名 | tool | args | タスク目的 | タスク完了条件 | リスク・考慮事項と対応 | 進行状況 | 確認状況 |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| 行うタスクの内容をわかりやすい短いセンテンスで記述。 | toolの名前 | argsの値をカンマ区切りで記載してください。 | タスクの目的を記載してください。 | タスクの完了条件を記載してください。 | リスクや考慮事項を記載してください。また、リスクや考慮事項に対処する方法を記載してください。<br/> 改行は<br/>で記述。 |  |  |\n| 行うタスクの内容をわかりやすい短いセンテンスで記述。 | toolの名前 | argsの値をカンマ区切りで記載してください。 | タスクの目的を記載してください。 | タスクの完了条件を記載してください。 | リスクや考慮事項を記載してください。また、リスクや考慮事項に対処する方法を記載してください。<br/> 改行は<br/>で記述。 |  |  |

必ずJSONエスケープされたmarkdown形式で返答し、markdown以外の情報は不要です。プロジェクトを成功に導く実行可能な計画を作成してください。

args2には、ユーザ表示用にタスク名とタスクの目的を、改行とインデントを入れてわかりやすく表示してください。以下のような形式です。
"タスク1名"\n  "タスク1目的"\n\n"タスク2名"\n  "タスク2目的"\n\n# 以下同様...

# ！！！！！重要！！！！
args1のmarkdownの表は必ずJSONエスケープを行ってください。markdownの表の内容はMarkdownの表を維持するように、改行は<br/>で、パイプは#124でエスケープしてください。
args2の文字列は必ずJSONエスケープを行ってください。`;

    // どのAIが使用できるかを定義 - 賢者たちの選択
    isForTool(aiName: AiName, execution: boolean): boolean {
        return aiName === "melchior" && !execution; 
    }

    execute(llmCommandResult: LLMCommandResult) {
        return new Promise<ToolResult>(resolve => {
            
            const plan = llmCommandResult.args[0];
            if (!plan || plan.trim().length === 0) {
                resolve({
                    displayMessage: "❌ 計画提案エラー: 実行プランが提供されていません。",
                    displayCommand: "showMessage",
                    result: "error",
                    resultDetail: "Empty plan provided",
                    llmCommandResult: llmCommandResult
                });
                return;
            }
            resolve({
                displayMessage: this.buildPlanMessage(plan),
                displayCommand: "showMessage",
                result: "success",
                llmCommandResult: llmCommandResult
            });
        });
    }

    private buildPlanMessage(plan: string): string {
        return `📋 プロジェクト実行計画提案\n\n` +
               `🎯 以下の実行可能な計画を提案いたします:\n\n` +
               `\`\`\`markdown\n${plan}\n\`\`\`\n\n` +
               `✨ この計画に基づいて、プロジェクトの成功に向けて段階的に進めていくことを推奨します。`;
    }
}