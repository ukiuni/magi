import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { VSCodeLLM } from '../../src/llm/VSCodeLLM.js';

describe('E2E: LLM model selection override', () => {
    let selectModelsStub: sinon.SinonStub;

    beforeEach(() => {
        process.env.TEST_ALLOWED_MODELS = 'gpt-4o,gpt-4.1,gpt-5-mini';
        selectModelsStub = sinon.stub(vscode.lm, 'selectChatModels');

        const fakeModels: any[] = [
            { name: 'gpt-5-mini', sendRequest: async (messages: any) => ({ text: ['ok'] }) },
            { name: 'gpt-4o', sendRequest: async (messages: any) => ({ text: ['ok'] }) },
            { name: 'gpt-4.1', sendRequest: async (messages: any) => ({ text: ['ok'] }) },
            { name: 'gpt-premium', sendRequest: async (messages: any) => ({ text: ['premium'] }) }
        ];

        selectModelsStub.resolves(fakeModels as any);
    });

    afterEach(() => {
        sinon.restore();
        delete process.env.TEST_ALLOWED_MODELS;
    });

    it('VSCodeLLM uses allowed model from env override', async () => {
        const llm = new VSCodeLLM('gpt-5-mini');
        const response = await llm.think('hello');
        assert.strictEqual(response, 'ok');
    });
});
