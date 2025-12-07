import * as assert from 'assert';
import { getAllTools } from '../../src/tools/ToolFactory.js';

describe('ToolFactory Full', () => {
  it('all tools have name and isForTool', () => {
    const all = getAllTools();
    for (const t of all) {
      assert.ok(typeof t.name === 'string' && t.name.length > 0, `tool ${t} has invalid name`);
      assert.ok(typeof t.isForTool === 'function', `tool ${t.name} missing isForTool`);
    }
  });
});
