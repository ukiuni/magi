import * as assert from 'assert';
import { createTool, getAllTools } from '../../src/tools/ToolFactory.js';

describe('ToolFactory', () => {
  it('getAllTools returns array', () => {
    const all = getAllTools();
    assert.ok(Array.isArray(all));
    assert.ok(all.length > 0);
  });

  it('createTool returns tool by name when available', () => {
    const t = createTool('grepFiles', 'melchior', false as any);
    assert.ok(t && t.name === 'grepFiles');
  });
});
