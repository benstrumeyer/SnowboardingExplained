import { ToolRegistry } from '../tools/registry';
import { ResponseFormatter } from '../middleware/responseFormatter';
import { withTimeout } from '../middleware/errorHandler';

export class MCPClient {
  constructor(private toolRegistry: ToolRegistry) {}

  async callTool(toolName: string, params: Record<string, any>): Promise<any> {
    const startTime = Date.now();

    try {
      const result = await withTimeout(
        this.toolRegistry.call(toolName, params),
        5000
      );

      const queryTime = Date.now() - startTime;
      return ResponseFormatter.success(result, false, queryTime);
    } catch (error) {
      const queryTime = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      return ResponseFormatter.error(message, 'TOOL_ERROR', queryTime);
    }
  }

  async chainTools(toolCalls: Array<{ tool: string; params: Record<string, any> }>): Promise<any[]> {
    const results = [];

    for (const call of toolCalls) {
      const result = await this.callTool(call.tool, call.params);
      results.push(result);

      // If a tool fails, stop the chain
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  getAvailableTools(): Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }> {
    return this.toolRegistry.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }
}
