export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  handler: (params: Record<string, any>) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  register(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getAll(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  async call(name: string, params: Record<string, any>): Promise<any> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // Validate parameters
    this.validateParameters(tool, params);

    try {
      return await tool.handler(params);
    } catch (error) {
      throw new Error(`Tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateParameters(tool: MCPTool, params: Record<string, any>): void {
    for (const [key, param] of Object.entries(tool.parameters)) {
      if (param.required && !(key in params)) {
        throw new Error(`Missing required parameter: ${key}`);
      }

      if (key in params && params[key] !== null && params[key] !== undefined) {
        const value = params[key];
        const expectedType = param.type;

        if (expectedType === 'array' && !Array.isArray(value)) {
          throw new Error(`Parameter ${key} must be an array`);
        } else if (expectedType !== 'array' && typeof value !== expectedType) {
          throw new Error(`Parameter ${key} must be of type ${expectedType}`);
        }

        if (param.enum && !param.enum.includes(value)) {
          throw new Error(`Parameter ${key} must be one of: ${param.enum.join(', ')}`);
        }
      }
    }
  }
}
