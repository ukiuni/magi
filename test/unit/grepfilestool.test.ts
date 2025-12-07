import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { GrepFilesTool } from '../../src/tools/GrepFilesTool.js';
import { LLMCommandResult } from '../../src/llm/LLMCommandResult.js';

describe('GrepFilesTool', () => {
  let wfStub: any;
  let fsStub: any;

  beforeEach(() => {
    // Setup a fake workspace folder
    wfStub = { uri: vscode.Uri.file('/workspace') };
    (vscode.workspace as any).workspaceFolders = [wfStub];

    fsStub = {
      stat: sinon.stub().resolves({ type: vscode.FileType.Directory }),
      readDirectory: sinon.stub().resolves([['file.txt', vscode.FileType.File]]),
      readFile: sinon.stub().resolves(Buffer.from('hello world\nmatch me\n'))
    };
    (vscode.workspace as any).fs = fsStub;

    // Use the vscode mock provided in node_modules/vscode/index.js
  });

  afterEach(() => {
    sinon.restore();
    (vscode.workspace as any).workspaceFolders = undefined;
  });

  it('returns error when pattern missing', async () => {
    const tool = new GrepFilesTool();
    const res = await tool.execute(new LLMCommandResult({ tool: 'grepFiles', args: [], executionSummary: '', executionDescription: '' }));
    assert.strictEqual(res.result, 'error');
  });

  it('finds matches in files', async () => {
    const tool = new GrepFilesTool();
    const res = await tool.execute(new LLMCommandResult({ tool: 'grepFiles', args: ['match', '.', '1'], executionSummary: '', executionDescription: '' }));
    assert.strictEqual(res.result, 'success');
    assert.ok(res.displayMessage.includes('検索完了'));
  });
});

function vscodeUriJoinPath(u: any, p: any) {
  // simple join for tests
  return { fsPath: `${u.fsPath || u.path || u}/${p}`, toString() { return this.fsPath; } };
}
