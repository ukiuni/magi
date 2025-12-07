import { LLMCommandResult } from "../llm/LLMCommandResult.js";
import { Tool, ToolResult, AiName } from "./ToolInterface.js";
import * as vscode from 'vscode';

const testVscode: any = (globalThis as any).__VSCODE_MOCK__;
const vscodeApi: any = testVscode || vscode;

export class GrepFilesTool implements Tool {
  name = 'grepFiles';
  description = '指定したルートパスからファイルを再帰検索して正規表現にマッチする行を返します。args: [regex, path(optional, workspace-relative), maxDepth(optional)]';

  isForTool(aiName: AiName): boolean { return true; }

  async execute(llmCommandResult: LLMCommandResult): Promise<ToolResult> {
    const args = llmCommandResult.args || [];
    const pattern = args[0];
    const maybePath = args[1];
    const maxDepthArg = args[2];

    if (!pattern) { return { displayMessage: 'エラー: 検索パターンが指定されていません', displayCommand: 'showMessage', result: 'error', resultDetail: '正規表現を指定してください。', llmCommandResult }; }

    const wf = vscodeApi.workspace.workspaceFolders?.[0];
    if (!wf) { return { displayMessage: 'エラー: ワークスペースが開かれていません', displayCommand: 'showMessage', result: 'error', resultDetail: 'ワークスペースを開いてください。', llmCommandResult }; }

    const rootPath = maybePath ? String(maybePath) : '';
    const normalized = rootPath ? String(rootPath).replace(/\\/g, '/').replace(/\/+/g, '/') : '';
    if (normalized) {
      if (normalized.includes('..') || normalized.startsWith('/') || normalized.includes(':')) {
        return { displayMessage: `エラー: 無効なルートパスです: ${rootPath}`, displayCommand: 'showMessage', result: 'error', resultDetail: 'ワークスペース内の相対パスを指定してください。', llmCommandResult };
      }
    }

    const rootUri = normalized ? (vscodeApi.Uri || vscode.Uri).joinPath(wf.uri, normalized) : wf.uri;
    try {
      const s = await vscode.workspace.fs.stat(rootUri);
      if (!(s.type & vscode.FileType.Directory)) { throw new Error('not dir'); }
    } catch (e) {
      return { displayMessage: `エラー: ルート '${rootPath || '.'}' が存在しません`, displayCommand: 'showMessage', result: 'error', resultDetail: '存在するディレクトリを指定してください。', llmCommandResult };
    }

    let maxDepth = Number.POSITIVE_INFINITY;
    if (maxDepthArg !== undefined && maxDepthArg !== null && String(maxDepthArg).trim() !== '') {
      const n = parseInt(String(maxDepthArg), 10);
      if (!isNaN(n) && n >= 0) { maxDepth = n; }
    }

    let rx: RegExp;
    try { rx = new RegExp(String(pattern), 'gu'); } catch (e) { return { displayMessage: `エラー: 無効な正規表現 '${pattern}'`, displayCommand: 'showMessage', result: 'error', resultDetail: String(e), llmCommandResult }; }

    const decoder = new TextDecoder();
    const results: Array<{ file: string; line: number; text: string; match: string }> = [];

    const textExt = new Set(['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.py', '.java', '.c', '.cpp', '.h', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.dart', '.vue', '.svelte', '.sql', '.sh']);

    const walk = async (uri: vscode.Uri, depth: number) => {
      if (depth > maxDepth) { return; }
      let entries: [string, vscode.FileType][];
      try { entries = await (vscodeApi.workspace.fs || vscode.workspace.fs).readDirectory(uri); } catch { return; }
      for (const [name, type] of entries) {
        const child = vscode.Uri.joinPath(uri, name);
          if (type === (vscodeApi.FileType || vscode.FileType).Directory) { await walk(child, depth + 1); }
        else if (type === (vscodeApi.FileType || vscode.FileType).File) {
          const lower = name.toLowerCase();
          const ext = lower.includes('.') ? lower.substring(lower.lastIndexOf('.')) : '';
          if (!textExt.has(ext) && ext !== '') { continue; }
          try {
            const data = await (vscodeApi.workspace.fs || vscode.workspace.fs).readFile(child);
            const text = decoder.decode(data);
            const lines = text.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              try { rx.lastIndex = 0; } catch { }
              const matches = Array.from(line.matchAll(rx));
              for (const m of matches) {
                results.push({ file: vscode.workspace.asRelativePath(child), line: i + 1, text: line, match: String(m[0]) });
              }
            }
          } catch { }
        }
      }
    };

    await walk(rootUri, 0);

    if (results.length === 0) { return { displayMessage: `検索完了: 0 件`, displayCommand: 'showMessage', result: 'success', resultDetail: `検索パターン '${String(pattern)}' に一致する行は見つかりませんでした。`, llmCommandResult }; }

    const show = results.slice(0, 200).map(r => `📄 ${r.file}:${r.line}\n   ${r.text}\n   ↳ マッチ: "${r.match}"`).join('\n\n');
    const detail = `合計 ${results.length} 件の一致を検出しました。\n\n${show}${results.length > 200 ? `\n\n... 他 ${results.length - 200} 件の結果があります` : ''}`;
    return { displayMessage: `検索完了: ${results.length} 件見つかりました`, displayCommand: 'showMessage', result: 'success', resultDetail: detail, llmCommandResult };
  }
}
