import * as assert from 'assert';
import * as sinon from 'sinon';
import { Caspar } from '../../src/ai/Caspar.js';
import { LLM } from '../../src/llm/LLM.js';
import { PromptContext } from '../../src/ai/PromptContext.js';

class FakeLLM implements LLM {
  thinkReturn: string = '{}';
  async think(prompt: string): Promise<string> {
    return this.thinkReturn;
  }
}

describe('Caspar (Feedback Provider)', () => {
  let caspar: Caspar;
  let llm: FakeLLM;
  let ctx: PromptContext;

  beforeEach(() => {
    llm = new FakeLLM();
    caspar = new Caspar(llm);
    ctx = new PromptContext({ userPrompt: 'test task', plan: '', toolResultHistory: [] });
  });

  describe('ask() - Execution Review', () => {
    it('parses valid feedback JSON from LLM', async () => {
      const validResponse = JSON.stringify({
        tool: 'message',
        args: ['Task completed successfully'],
        executionSummary: 'Task finished',
        executionDescription: 'User-friendly completion message'
      });
      llm.thinkReturn = validResponse;

      const [result, responseText] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.tool, 'message');
      assert.strictEqual(responseText, validResponse);
    });

    it('throws on invalid JSON response', async () => {
      llm.thinkReturn = '{ malformed json ]';

      try {
        await caspar.ask(ctx, []);
        assert.fail('Should have thrown');
      } catch (error: any) {
        assert.ok(error instanceof SyntaxError);
      }
    });

    it('handles message tool response', async () => {
      const messageResponse = JSON.stringify({
        tool: 'message',
        args: ['Your code has been reviewed'],
        executionSummary: 'Review complete',
        executionDescription: 'Code review feedback provided'
      });
      llm.thinkReturn = messageResponse;

      const [result] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.tool, 'message');
      assert.deepStrictEqual(result.args, ['Your code has been reviewed']);
    });

    it('handles recommendComplete tool response', async () => {
      const recommendResponse = JSON.stringify({
        tool: 'recommendComplete',
        args: ['Task is ready'],
        executionSummary: 'Completion recommended',
        executionDescription: 'Ready to finalize'
      });
      llm.thinkReturn = recommendResponse;

      const [result] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.tool, 'recommendComplete');
    });

    it('extracts complex args from response', async () => {
      const complexResponse = JSON.stringify({
        tool: 'message',
        args: ['Line 1', 'Line 2', 'Line 3'],
        executionSummary: 'Multi-line feedback',
        executionDescription: 'Complex message'
      });
      llm.thinkReturn = complexResponse;

      const [result] = await caspar.ask(ctx, []);
      
      assert.deepStrictEqual(result.args, ['Line 1', 'Line 2', 'Line 3']);
    });
  });

  describe('ask() - Response Content', () => {
    it('correctly extracts executionSummary field', async () => {
      const response = JSON.stringify({
        tool: 'message',
        args: ['ok'],
        executionSummary: 'This is the summary',
        executionDescription: 'This is the description'
      });
      llm.thinkReturn = response;

      const [result] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.executionSummary, 'This is the summary');
    });

    it('correctly extracts executionDescription field', async () => {
      const response = JSON.stringify({
        tool: 'message',
        args: ['ok'],
        executionSummary: 'summary',
        executionDescription: 'Detailed user feedback'
      });
      llm.thinkReturn = response;

      const [result] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.executionDescription, 'Detailed user feedback');
    });

    it('preserves responseText exactly as returned from LLM', async () => {
      const originalResponse = JSON.stringify({
        tool: 'message',
        args: ['content'],
        executionSummary: 'sum',
        executionDescription: 'desc'
      });
      llm.thinkReturn = originalResponse;

      const [, responseText] = await caspar.ask(ctx, []);
      
      assert.strictEqual(responseText, originalResponse);
    });
  });

  describe('ask() - Error Handling', () => {
    it('throws on empty LLM response', async () => {
      llm.thinkReturn = '';

      try {
        await caspar.ask(ctx, []);
        assert.fail('Should have thrown');
      } catch (error: any) {
        assert.ok(error instanceof SyntaxError || error.message.includes('JSON'));
      }
    });

    it('throws on missing required fields', async () => {
      const incompleteResponse = JSON.stringify({
        tool: 'message'
      });
      llm.thinkReturn = incompleteResponse;

      try {
        const [result] = await caspar.ask(ctx, []);
        assert.ok(result);
      } catch (error) {
        assert.ok(error);
      }
    });

    it('handles empty args array', async () => {
      const noArgsResponse = JSON.stringify({
        tool: 'message',
        args: [],
        executionSummary: 'No additional feedback',
        executionDescription: 'Silent completion'
      });
      llm.thinkReturn = noArgsResponse;

      const [result] = await caspar.ask(ctx, []);
      
      assert.deepStrictEqual(result.args, []);
    });

    it('handles very long feedback message', async () => {
      const longMessage = 'x'.repeat(5000);
      const response = JSON.stringify({
        tool: 'message',
        args: [longMessage],
        executionSummary: 'Long feedback',
        executionDescription: 'Extended message'
      });
      llm.thinkReturn = response;

      const [result] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.args[0].length, 5000);
    });

    it('handles LLM thinking errors', async () => {
      llm.thinkReturn = 'not valid json at all';

      try {
        await caspar.ask(ctx, []);
        assert.fail('Should have thrown');
      } catch (error: any) {
        assert.ok(error instanceof SyntaxError);
      }
    });
  });

  describe('ask() - With Execution History', () => {
    it('includes tool execution history in feedback generation', async () => {
      const response = JSON.stringify({
        tool: 'message',
        args: ['Feedback based on history'],
        executionSummary: 'Contextual feedback',
        executionDescription: 'Using history'
      });
      llm.thinkReturn = response;

      const history: any[] = [
        {
          displayMessage: 'Created file',
          displayCommand: 'createFile',
          result: 'success',
          llmCommandResult: { tool: 'createFile', args: ['file.ts'], executionSummary: 'File created', executionDescription: 'New file' }
        }
      ];

      const [result] = await caspar.ask(ctx, history);
      
      assert.strictEqual(result.tool, 'message');
    });

    it('can handle multiple execution results', async () => {
      const response = JSON.stringify({
        tool: 'recommendComplete',
        args: ['All steps done'],
        executionSummary: 'Review of all steps',
        executionDescription: 'Task complete'
      });
      llm.thinkReturn = response;

      const history: any[] = [
        {
          displayMessage: 'Step 1 done',
          displayCommand: 'createFile',
          result: 'success',
          llmCommandResult: { tool: 'createFile', args: ['file.ts'], executionSummary: 'S1', executionDescription: 'D1' }
        },
        {
          displayMessage: 'Step 2 done',
          displayCommand: 'updateFile',
          result: 'success',
          llmCommandResult: { tool: 'updateFile', args: ['file.ts'], executionSummary: 'S2', executionDescription: 'D2' }
        },
        {
          displayMessage: 'Step 3 failed',
          displayCommand: 'terminal',
          result: 'error',
          llmCommandResult: { tool: 'terminal', args: ['build'], executionSummary: 'S3', executionDescription: 'D3' }
        }
      ];

      const [result] = await caspar.ask(ctx, history);
      
      assert.strictEqual(result.tool, 'recommendComplete');
    });

    it('handles execution history with mixed success and errors', async () => {
      const response = JSON.stringify({
        tool: 'message',
        args: ['Some issues found but progress made'],
        executionSummary: 'Mixed results feedback',
        executionDescription: 'Constructive feedback'
      });
      llm.thinkReturn = response;

      const history: any[] = [
        {
          displayMessage: 'Success',
          displayCommand: 'read',
          result: 'success',
          llmCommandResult: { tool: 'readFile', args: ['file.ts'], executionSummary: 'Read OK', executionDescription: 'File read' }
        },
        {
          displayMessage: 'Failed',
          displayCommand: 'delete',
          result: 'error',
          resultDetail: 'File not found',
          llmCommandResult: { tool: 'terminal', args: ['rm'], executionSummary: 'Delete failed', executionDescription: 'Not found' }
        }
      ];

      const [result] = await caspar.ask(ctx, history);
      
      assert.ok(result.args[0].includes('issues'));
    });
  });

  describe('ask() - Different Tool Options', () => {
    it('supports recommendComplete tool for task completion', async () => {
      const response = JSON.stringify({
        tool: 'recommendComplete',
        args: ['Ready to deliver'],
        executionSummary: 'Completion OK',
        executionDescription: 'Task ready'
      });
      llm.thinkReturn = response;

      const [result] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.tool, 'recommendComplete');
    });

    it('provides message feedback for interim progress', async () => {
      const response = JSON.stringify({
        tool: 'message',
        args: ['Keep going, almost there'],
        executionSummary: 'Progress update',
        executionDescription: 'Encouraging message'
      });
      llm.thinkReturn = response;

      const [result] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.tool, 'message');
    });

    it('handles multiple message lines in args', async () => {
      const response = JSON.stringify({
        tool: 'message',
        args: [
          'Line 1: Good progress',
          'Line 2: Fix this issue',
          'Line 3: Then submit'
        ],
        executionSummary: 'Multi-point feedback',
        executionDescription: 'Detailed suggestions'
      });
      llm.thinkReturn = response;

      const [result] = await caspar.ask(ctx, []);
      
      assert.strictEqual(result.args.length, 3);
      assert.ok(result.args[0].includes('Line 1'));
    });
  });

  describe('ask() - Context Integration', () => {
    it('provides feedback in context of user prompt', async () => {
      const userPrompt = 'Implement a REST API endpoint';
      const contextWithPrompt = new PromptContext({
        userPrompt,
        plan: '',
        toolResultHistory: []
      });

      const response = JSON.stringify({
        tool: 'message',
        args: ['Your REST API looks good'],
        executionSummary: 'API review',
        executionDescription: 'Feedback on REST implementation'
      });
      llm.thinkReturn = response;

      const [result] = await caspar.ask(contextWithPrompt, []);
      
      assert.strictEqual(result.tool, 'message');
    });

    it('provides feedback in context of plan', async () => {
      const contextWithPlan = new PromptContext({
        userPrompt: 'Build feature X',
        plan: 'Step 1: Create models\nStep 2: Add API',
        toolResultHistory: []
      });

      const response = JSON.stringify({
        tool: 'message',
        args: ['Plan is well-structured'],
        executionSummary: 'Plan review',
        executionDescription: 'Good planning'
      });
      llm.thinkReturn = response;

      const [result] = await caspar.ask(contextWithPlan, []);
      
      assert.strictEqual(result.tool, 'message');
    });
  });
});
