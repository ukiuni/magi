import * as path from 'path';

const vscodeMock = {
  lm: { selectChatModels: async () => [] },
  LanguageModelChatMessage: { User: (content) => ({ role: 'user', content }) },
  CancellationTokenSource: class CancellationTokenSource { constructor() { this.token = { isCancellationRequested: false }; } },
  workspace: {
    workspaceFolders: undefined,
    fs: {
      stat: async () => ({ type: 2 }),
      readDirectory: async () => [],
      readFile: async () => Buffer.from('')
    },
    asRelativePath: (uri) => uri?.fsPath || uri?.path || String(uri || '')
  },
  Uri: {
    file: (p) => ({ fsPath: p, path: p, toString() { return this.fsPath; } }),
    joinPath: (u, p) => ({ fsPath: path.join(u.fsPath || u.path || u, p), path: path.join(u.fsPath || u.path || u, p), toString() { return this.fsPath; } })
  },
  FileType: { File: 1, Directory: 2 },
  // Add other necessary exports here
  window: {
    createOutputChannel: () => ({ append: () => {}, appendLine: () => {}, show: () => {} }),
    showErrorMessage: async () => {},
    showInformationMessage: async () => {}
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: async () => {}
  },
  ExtensionContext: class ExtensionContext { subscriptions = []; }
};

// Expose globally for tests that might need to access the mock instance
globalThis.__VSCODE_MOCK__ = vscodeMock;

export const lm = vscodeMock.lm;
export const LanguageModelChatMessage = vscodeMock.LanguageModelChatMessage;
export const CancellationTokenSource = vscodeMock.CancellationTokenSource;
export const workspace = vscodeMock.workspace;
export const Uri = vscodeMock.Uri;
export const FileType = vscodeMock.FileType;
export const window = vscodeMock.window;
export const commands = vscodeMock.commands;

export default vscodeMock;
