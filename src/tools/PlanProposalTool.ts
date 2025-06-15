import { LLMCommandResult } from "../llm/LLMCommandResult"; // 魔法の橋渡し
import { Tool, ToolResult, AiName } from "./ToolInterface"; // 契約の定義書

export class PlanProposalTool implements Tool {
    name = "planProposal"; // 計画立案の名前
    description = `planProposalツールは、プロジェクトを成功に導く実行可能な計画をYAML形式で提案するツールです。
args1にはYAML形式の実行計画を入れてください。実行計画のフォーマットは以下とします。
request:\n  summary: "依頼のサマリ"\n  description: "依頼内容の詳細説明"\n  objectives:\n    - "目標1"\n    - "目標2"\nphases:\n  - name: "フェーズ1名"\n    description: "フェーズの説明"\n    tasks:\n      - name: "タスク名"\n        description: "タスクの詳細説明"\n        executeTool: "実行するツール名"\n        deliverables:\n          - "成果物1"\n          - "成果物2"\n      - name: "タスク2"\n        # 以下同様...\nrisks:\n  - description: "リスクの説明"\n    mitigation: "対策"\n    probability: "high/medium/low"\n    impact: "high/medium/low"\nsuccess_criteria:\n  - "成功条件1"\n  - "成功条件2"\nestimated_timeline: "全体の予想処理回数"

必ずJSONエスケープされたYAML形式で返答し、YAML以外の情報は不要です。プロジェクトを成功に導く実行可能な計画を作成してください。

args2には、ユーザ表示用にphasesとtasksの内容を含む文字列とrisksのdescriptionを、改行を入れてわかりやすく表示してください。以下のような形式です。
"フェーズ1名"\n  "タスク1名"\n  "タスク2名"\n\n"フェーズ2名"\n  "タスク2-1名"\n  "タスク2-2名"\n\n# 以下同様...\n\n"リスクの説明"\n"対策"

# ！！！！！重要！！！！
args1のYAMLは必ずJSONエスケープを行ってください。
args2の文字列は必ずJSONエスケープを行ってください。`;

    // どのAIが使用できるかを定義 - 賢者たちの選択
    isForTool(aiName: AiName, execution: boolean): boolean {
        return aiName === "melchior" && !execution; 
    }

    execute(llmCommandResult: LLMCommandResult) { // 実行の儀式
        return new Promise<ToolResult>(resolve => {
            
            const yamlPlan = llmCommandResult.args[0]; // 第一引数から計画を取得
            
            // YAML形式の計画が提供されているかを簡易チェック - 品質の確認
            if (!yamlPlan || yamlPlan.trim().length === 0) {
                resolve({
                    displayMessage: "❌ 計画提案エラー: YAML形式の実行プランが提供されていません。", // エラーの通知
                    displayCommand: "showMessage", // 表示コマンド
                    result: "error", // 失敗の結果
                    resultDetail: "Empty plan provided", // 詳細なエラー情報
                    llmCommandResult: llmCommandResult // 元のコマンド結果
                });
                return;
            }

            // 成功時の結果を返す - 勝利の宣言
            resolve({
                displayMessage: this.buildPlanMessage(yamlPlan), // 計画のメッセージ構築
                displayCommand: "showMessage", // 表示コマンド
                result: "success", // 成功の結果
                llmCommandResult: llmCommandResult // 元のコマンド結果
            });
        });
    }

    private buildPlanMessage(yamlPlan: string): string { // メッセージ構築の技術
        return `📋 プロジェクト実行計画提案\n\n` + // ヘッダーの装飾
               `🎯 以下の実行可能な計画を提案いたします:\n\n` + // 目的の説明
               `\`\`\`yaml\n${yamlPlan}\n\`\`\`\n\n` + // YAML形式での計画表示
               `✨ この計画に基づいて、プロジェクトの成功に向けて段階的に進めていくことを推奨します。`; // 推奨メッセージ
    }
}