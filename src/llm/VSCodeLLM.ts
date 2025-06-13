import { AiName } from '../tools/ToolInterface';
import { LLM } from './LLM';
import * as vscode from 'vscode';

export class VSCodeLLM implements LLM {
    name: AiName;
    personality: string;

    constructor(name: AiName, personality: string) {
        this.name = name;
        this.personality = personality;
    }

    async think(promptGenerator: (aiName:AiName, personality: string) => string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4.1' });
            if (!model) {
                reject(new Error("No available model found."));
                return;
            }
            try {
                const userPrompt = promptGenerator(this.name, this.personality);
                const messages = [
                    vscode.LanguageModelChatMessage.User(userPrompt)
                ];
                const chatResponse = await model.sendRequest(
                    messages,
                    {},
                    new vscode.CancellationTokenSource().token
                );
                const returnTexts = [];
                for await (const fragment of chatResponse.text) {
                    returnTexts.push(fragment);
                };
                const responseText = returnTexts.join('');
                resolve(responseText);
            }
            catch (error) {
                reject(error);
                return;
            }
        });
    }
}