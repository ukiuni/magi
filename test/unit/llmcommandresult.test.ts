import * as assert from 'assert';
import { LLMCommandResult } from '../../src/llm/LLMCommandResult.js';

describe('LLMCommandResult', () => {
  it('constructs correctly', () => {
    const obj = new LLMCommandResult({ tool: 't', args: ['a'], executionSummary: 's', executionDescription: 'd' });
    assert.strictEqual(obj.tool, 't');
    assert.deepStrictEqual(obj.args, ['a']);
    assert.strictEqual(obj.executionSummary, 's');
    assert.strictEqual(obj.executionDescription, 'd');
  });
});
