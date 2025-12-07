// Central test setup for mocha
import 'vscode';

console.log('Test setup loaded. VS Code mock should be active via node_modules/vscode link.');

export const vscodeMock = (globalThis as any).__VSCODE_MOCK__;
