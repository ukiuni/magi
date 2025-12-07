import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { VSCodeLLM } from '../../src/llm/VSCodeLLM.js';

function asyncTextIterable(frags: string[]) {
  return (async function* () { for (const f of frags) { yield f; } })();
}

describe('VSCodeLLM', () => {
  afterEach(() => sinon.restore());

  it('think returns text from model when available', async () => {
    const fakeModel: any = {
      name: 'gpt-5-mini',
      sendRequest: async () => ({ text: asyncTextIterable(['ok']) })
    };
    const stub = sinon.stub(vscode.lm, 'selectChatModels').resolves([fakeModel]);

    const llm = new VSCodeLLM('gpt-5-mini');
    const r = await llm.think('hello');
    assert.strictEqual(r, 'ok');
    assert.ok(stub.calledOnce);
  });

  it('think retries and succeeds when model appears on second call', async () => {
    const fakeModel: any = {
      name: 'gpt-5-mini',
      sendRequest: async () => ({ text: asyncTextIterable(['ok']) })
    };
    const stub = sinon.stub(vscode.lm, 'selectChatModels');
    stub.onFirstCall().resolves([]);
    stub.onSecondCall().resolves([fakeModel]);

    // stub setTimeout to call immediately to avoid waiting 2s
    const timeoutStub = sinon.stub(global as any, 'setTimeout').callsFake((fn: any) => { fn(); return 0; });

    const llm = new VSCodeLLM('gpt-5-mini');
    const r = await llm.think('hello');
    assert.strictEqual(r, 'ok');
    assert.ok(stub.calledTwice);
    timeoutStub.restore();
  });

  it('think rejects when model not found after retry', async () => {
    const stub = sinon.stub(vscode.lm, 'selectChatModels').resolves([]);
    const timeoutStub = sinon.stub(global as any, 'setTimeout').callsFake((fn: any) => { fn(); return 0; });

    const llm = new VSCodeLLM('gpt-5-mini');
    let threw = false;
    try {
      await llm.think('hi');
    } catch (e) {
      threw = true;
      assert.ok((e as Error).message.includes('not found'));
    }
    assert.ok(threw);
    timeoutStub.restore();
  });
});
