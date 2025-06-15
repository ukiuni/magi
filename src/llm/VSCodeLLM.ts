import { AiName } from '../tools/ToolInterface';
import { LLM } from './LLM';
import * as vscode from 'vscode';

export class VSCodeLLM implements LLM {

    async think(prompt: string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4.1' });
            if (!model) {
                reject(new Error("No available model found."));
                return;
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