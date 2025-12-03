import { AiName } from '../tools/ToolInterface';
import { LLM } from './LLM';
import * as vscode from 'vscode';

export class VSCodeLLM implements LLM {
    private modelName: string;

    constructor(modelName?: string) {
        this.modelName = modelName || 'gpt-5-mini';
    }

    async think(prompt: string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
            let model = models.find(m => m.name === this.modelName);

            if (!model) {// retry for selectChatModels nees time to be ready
                console.warn(`Model ${this.modelName} not found. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
                model = models.find(m => m.name === this.modelName);
                if (!model) {
                    reject(new Error(`Model ${this.modelName} not found after retry.`));
                    return;
                }
            }
            try {
                const messages = [
                    vscode.LanguageModelChatMessage.User(prompt)
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