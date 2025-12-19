# WSL-Kiro Integration - Design

## Overview

Create an MCP server that bridges Kiro to WSL, enabling file access, command execution, and service management. This allows Kiro to directly edit code and run tests on the WSL pose-service without manual file transfers.

## Architecture

### Current Workflow (Manual)
```
Kiro (Windows)
    ↓
Edit file locally
    ↓
Manually copy to WSL
    ↓
SSH into WSL
    ↓
Run commands manually
    ↓
Copy results back
```

### Desired Workflow (Integrated)
```
Kiro (Windows)
    ↓
MCP Server (Windows)
    ↓
WSL Bridge (communicates with WSL)
    ↓
WSL Filesystem & Commands
    ↓
Results back to Kiro
```

## Components and Interfaces

### Component 1: MCP Server (Windows)

**Purpose**: Expose WSL file/command access as MCP tools

**Location**: `SnowboardingExplained/backend/mcp-server/src/tools/wslBridge.ts`

**Tools**:
```typescript
// File operations
readWslFile(path: string): Promise<string>
writeWslFile(path: string, content: string): Promise<void>
listWslDirectory(path: string): Promise<FileInfo[]>
deleteWslFile(path: string): Promise<void>

// Command execution
runWslCommand(command: string, cwd?: string): Promise<CommandResult>
runWslPython(script: string, args?: string[]): Promise<CommandResult>

// Service management
startPoseService(): Promise<void>
stopPoseService(): Promise<void>
getPoseServiceStatus(): Promise<ServiceStatus>

// Logs
getWslLogs(lines?: number): Promise<string>
followWslLogs(): Promise<AsyncIterator<string>>
```

### Component 2: WSL Bridge (Windows)

**Purpose**: Communicate with WSL via `wsl.exe` command

**Location**: `SnowboardingExplained/backend/mcp-server/src/utils/wslBridge.ts`

**Interface**:
```typescript
class WslBridge {
  // Execute command in WSL
  exec(command: string, cwd?: string): Promise<ExecResult>
  
  // Read file from WSL
  readFile(path: string): Promise<string>
  
  // Write file to WSL
  writeFile(path: string, content: string): Promise<void>
  
  // List directory in WSL
  listDir(path: string): Promise<FileInfo[]>
  
  // Get WSL path (convert Windows path to WSL path)
  toWslPath(windowsPath: string): string
  
  // Get Windows path (convert WSL path to Windows path)
  toWindowsPath(wslPath: string): string
}
```

**Implementation**:
```typescript
class WslBridge {
  private wslDistro = 'Ubuntu';  // WSL distro name
  
  async exec(command: string, cwd?: string): Promise<ExecResult> {
    // Execute: wsl -d Ubuntu -e bash -c "cd /path && command"
    const fullCommand = cwd 
      ? `wsl -d ${this.wslDistro} -e bash -c "cd ${cwd} && ${command}"`
      : `wsl -d ${this.wslDistro} -e bash -c "${command}"`;
    
    return new Promise((resolve, reject) => {
      exec(fullCommand, (error, stdout, stderr) => {
        resolve({
          exitCode: error?.code || 0,
          stdout,
          stderr,
          success: !error
        });
      });
    });
  }
  
  async readFile(path: string): Promise<string> {
    const result = await this.exec(`cat "${path}"`);
    if (!result.success) throw new Error(result.stderr);
    return result.stdout;
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    // Use heredoc to write file safely
    const escaped = content.replace(/"/g, '\\"');
    const result = await this.exec(`cat > "${path}" << 'EOF'\n${content}\nEOF`);
    if (!result.success) throw new Error(result.stderr);
  }
  
  toWslPath(windowsPath: string): string {
    // C:\Users\user\repo → /mnt/c/Users/user/repo
    return windowsPath
      .replace(/\\/g, '/')
      .replace(/^([A-Z]):/, (match, drive) => `/mnt/${drive.toLowerCase()}`);
  }
}
```

### Component 3: MCP Tool Implementations

**File Operations Tool**:
```typescript
export const wslFileTools = {
  readWslFile: {
    description: 'Read file from WSL filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path in WSL' }
      },
      required: ['path']
    },
    handler: async (input: { path: string }) => {
      const bridge = new WslBridge();
      const content = await bridge.readFile(input.path);
      return { content };
    }
  },
  
  writeWslFile: {
    description: 'Write file to WSL filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path in WSL' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['path', 'content']
    },
    handler: async (input: { path: string; content: string }) => {
      const bridge = new WslBridge();
      await bridge.writeFile(input.path, input.content);
      return { success: true };
    }
  }
};
```

**Command Execution Tool**:
```typescript
export const wslCommandTools = {
  runWslCommand: {
    description: 'Run command in WSL',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to run' },
        cwd: { type: 'string', description: 'Working directory (optional)' }
      },
      required: ['command']
    },
    handler: async (input: { command: string; cwd?: string }) => {
      const bridge = new WslBridge();
      const result = await bridge.exec(input.command, input.cwd);
      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        success: result.success
      };
    }
  },
  
  runWslPython: {
    description: 'Run Python script in WSL venv',
    inputSchema: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'Python script path' },
        args: { type: 'array', items: { type: 'string' }, description: 'Arguments' }
      },
      required: ['script']
    },
    handler: async (input: { script: string; args?: string[] }) => {
      const bridge = new WslBridge();
      const venvPath = '/home/user/pose-service/venv';
      const pythonPath = `${venvPath}/bin/python`;
      const argsStr = (input.args || []).join(' ');
      const command = `${pythonPath} ${input.script} ${argsStr}`;
      
      const result = await bridge.exec(command);
      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        success: result.success
      };
    }
  }
};
```

**Service Management Tool**:
```typescript
export const wslServiceTools = {
  startPoseService: {
    description: 'Start pose service on WSL',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const bridge = new WslBridge();
      const result = await bridge.exec(
        'cd /home/user/pose-service && ./venv/bin/python app.py',
        '/home/user/pose-service'
      );
      return {
        success: result.success,
        message: result.success ? 'Service started' : result.stderr
      };
    }
  },
  
  getPoseServiceStatus: {
    description: 'Get pose service status',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const bridge = new WslBridge();
      const result = await bridge.exec('curl -s http://localhost:5000/health');
      
      if (result.success && result.stdout.includes('healthy')) {
        return { status: 'running', healthy: true };
      } else {
        return { status: 'stopped', healthy: false };
      }
    }
  }
};
```

## Data Models

### ExecResult
```typescript
interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
}
```

### FileInfo
```typescript
interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
}
```

### ServiceStatus
```typescript
interface ServiceStatus {
  status: 'running' | 'stopped' | 'error';
  healthy: boolean;
  port?: number;
  pid?: number;
  uptime?: number;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.

### Property 1: File Read-Write Consistency
*For any* file written to WSL, reading it back should return identical content.

**Validates: Requirements 1.1, 1.2**

### Property 2: Command Execution Reliability
*For any* command executed on WSL, the exit code and output should be consistent across multiple runs.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Path Conversion Correctness
*For any* Windows path, converting to WSL path and back should recover the original path.

**Validates: Requirements 1.1, 1.3**

### Property 4: Service State Consistency
*For any* service state change (start/stop), the status query should reflect the new state within 1 second.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Error Handling Robustness
*For any* invalid operation (bad path, failed command), the system should return meaningful error message without crashing.

**Validates: Requirements 1.4, 2.4**

## Error Handling

### File Errors
- **File not found**: Return 404 with path
- **Permission denied**: Return 403 with path
- **File too large**: Return 413 with size limit
- **Invalid path**: Return 400 with validation error

### Command Errors
- **Command not found**: Return stderr with suggestion
- **Timeout**: Return partial output + timeout error
- **Permission denied**: Return stderr with sudo suggestion
- **Dangerous command**: Return 403 with warning

### Service Errors
- **Service not running**: Return status with logs
- **Port already in use**: Return error with suggestion
- **Startup failed**: Return error logs

## Testing Strategy

### Unit Tests
- Test path conversion (Windows ↔ WSL)
- Test file read/write with various content
- Test command execution with different commands
- Test error handling for invalid inputs

### Integration Tests
- Test end-to-end file operations
- Test command execution with real WSL
- Test service start/stop
- Test with actual pose-service

### Property-Based Tests
- Property 1: File consistency across random content
- Property 2: Command reliability across random commands
- Property 3: Path conversion across random paths
- Property 4: Service state consistency
- Property 5: Error handling for random invalid inputs

## Implementation Paths

### Path A: Simple MCP Server (RECOMMENDED)
**Files to create**:
- `backend/mcp-server/src/tools/wslBridge.ts` - MCP tools
- `backend/mcp-server/src/utils/wslBridge.ts` - WSL bridge
- `backend/mcp-server/src/config/wsl.config.ts` - WSL config

**Time**: 4-6 hours

**Features**:
- Read/write files on WSL
- Execute commands on WSL
- Run Python scripts
- Get service status

### Path B: MCP + File Sync
**Additional files**:
- `backend/mcp-server/src/services/fileSync.ts` - File sync service
- `backend/mcp-server/src/watchers/wslWatcher.ts` - WSL file watcher

**Time**: 8-10 hours

**Features**:
- All from Path A
- Automatic file sync Windows ↔ WSL
- Conflict detection and resolution

### Path C: Full Integration
**Additional files**:
- `backend/mcp-server/src/services/vitdetSetup.ts` - ViTDet automation
- `backend/mcp-server/src/services/serviceManager.ts` - Service control
- `backend/mcp-server/src/services/logStreamer.ts` - Log streaming

**Time**: 12-16 hours

**Features**:
- All from Path B
- ViTDet setup automation
- Service start/stop/restart
- Real-time log streaming

## Recommendation

**Implement Path A** because:
1. Enables Kiro to access/modify files immediately
2. Provides foundation for Path B/C
3. Can be extended incrementally
4. Lower risk and faster to implement
5. Solves the core problem (file access)

Upgrade to Path B if file sync becomes necessary.
Upgrade to Path C if full automation is needed.
