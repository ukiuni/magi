import { AiName } from '../tools/ToolInterface.js';
import { LLM } from './LLM.js';
import * as vscode from 'vscode';

const testVscode: any = (globalThis as any).__VSCODE_MOCK__;
const vscodeApi: any = testVscode || vscode;

export class VSCodeLLM implements LLM {
    private modelName: string;

    constructor(modelName?: string) {
        this.modelName = modelName || 'gpt-5-mini';
    }

    async think(prompt: string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let models: any[] = await vscodeApi.lm.selectChatModels({ vendor: 'copilot' });

            // If tests set an allow-list via env, prefer the first allowed model in the list
            const testAllowed = process.env.TEST_ALLOWED_MODELS;
            if (testAllowed) {
                const allowed = testAllowed.split(',').map(s => s.trim()).filter(Boolean);
                const filtered = models.filter(m => allowed.includes(m.name));
                if (filtered.length > 0) {
                    models = filtered;
                }
            }

            let model = models.find(m => m.name === this.modelName);

            if (!model) {// retry for selectChatModels nees time to be ready
                console.warn(`Model ${this.modelName} not found. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                models = await vscodeApi.lm.selectChatModels({ vendor: 'copilot' });
                model = models.find(m => m.name === this.modelName);
                if (!model) {
                    reject(new Error(`Model ${this.modelName} not found after retry.`));
                    return;
                }
            }
            try {
                const messages = [
                    (vscodeApi.LanguageModelChatMessage || vscode.LanguageModelChatMessage).User(prompt)
                ];
                const chatResponse = await model.sendRequest(
                    messages,
                    {},
                    new (vscodeApi.CancellationTokenSource || (vscode as any).CancellationTokenSource)().token
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