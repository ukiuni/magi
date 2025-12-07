import * as assert from 'assert';
import * as sinon from 'sinon';
import { Melchior } from '../../src/ai/Melchior.js';
import { LLM } from '../../src/llm/LLM.js';
import { PromptContext } from '../../src/ai/PromptContext.js';

class FakeLLM implements LLM {
  thinkReturn: string = '{}';
  async think(prompt: string): Promise<string> {
    return this.thinkReturn;
  }
}

describe('Melchior', () => {
  it('plan throws on invalid JSON', async () => {
    const fake = new FakeLLM();
    fake.thinkReturn = 'not-a-json';
    const mel = new Melchior(fake);
    const ctx = new PromptContext({ userPrompt: 'x', plan: '', toolResultHistory: [] });
    let threw = false;
    try {
      await mel.plan(ctx);
    } catch (e) {
      threw = true;
    }
    assert.ok(threw, 'Expected plan to throw on invalid JSON');
  });

  it('ask throws on invalid JSON', async () => {
    const fake = new FakeLLM();
    fake.thinkReturn = 'not-a-json';
    const mel = new Melchior(fake);
    const ctx = new PromptContext({ userPrompt: 'x', plan: '', toolResultHistory: [] });
    let threw = false;
    try {
      await mel.ask(ctx);
    } catch (e) {
      threw = true;
    }
    assert.ok(threw, 'Expected ask to throw on invalid JSON');
  });
});
