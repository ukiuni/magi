import * as assert from 'assert';
import { createAllToolsPrompt, createAllToolsDescriptionPrompt, createToolExecutionHistoryPrompt, createToolsPrompt, createMAGIDescriptionPrompt } from '../../src/ai/PromptUtils.js';

describe('PromptUtils', () => {
  it('createAllToolsPrompt joins tool names', () => {
    const tools: any[] = [{ name: 't1' }, { name: 't2' }];
    const out = createAllToolsPrompt(tools);
    assert.strictEqual(out, 't1, t2');
  });

  it('createAllToolsDescriptionPrompt includes descriptions', () => {
    const tools: any[] = [{ name: 't1', description: 'd1' }, { name: 't2', description: 'd2' }];
    const out = createAllToolsDescriptionPrompt(tools);
    assert.ok(out.includes('## t1'));
    assert.ok(out.includes('d1'));
  });

  it('createToolExecutionHistoryPrompt returns YAML string', () => {
    const history: any[] = [{ displayMessage: 'm', llmCommandResult: { tool: 'x' } }];
    const out = createToolExecutionHistoryPrompt(history);
    assert.ok(out.includes('履歴'));
    assert.ok(out.includes('tool: x') || out.includes('tool: "x"'));
  });

  it('createMAGIDescriptionPrompt returns text', () => {
    const out1 = createMAGIDescriptionPrompt(true);
    const out2 = createMAGIDescriptionPrompt(false);
    assert.ok(out1.includes('MAGI'));
    assert.ok(out2.includes('MAGI'));
  });
});
