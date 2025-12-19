# WSL-Kiro Integration - Implementation Plan (Path A: Simple MCP Server)

## Overview

Create an MCP server that exposes WSL file access and command execution as tools in Kiro. This enables Kiro to directly edit code and run commands on WSL without manual file transfers.

---

## Phase 1: WSL Bridge Infrastructure (2-3 hours)

### 1.1 Create WSL Bridge Utility
- [ ] Create `backend/mcp-server/src/utils/wslBridge.ts`
- [ ] Implement `WslBridge` class with methods:
  - `exec(command, cwd)` - execute command in WSL
  - `readFile(path)` - read file from WSL
  - `writeFile(path, content)` - write file to WSL
  - `listDir(path)` - list directory in WSL
  - `toWslPath(windowsPath)` - convert Windows path to WSL path
  - `toWindowsPath(wslPath)` - convert WSL path to Windows path
- [ ] Add error handling for all operations
- [ ] Add logging for debugging
- **Requirements**: 1.1, 1.2, 1.3

### 1.2 Test WSL Bridge Locally
- [ ] Create `backend/mcp-server/src/utils/wslBridge.test.ts`
- [ ] Test `exec()` with simple commands (echo, ls)
- [ ] Test `readFile()` with existing file
- [ ] Test `writeFile()` with new file
- [ ] Test path conversion (Windows ↔ WSL)
- [ ] Test error handling (invalid path, permission denied)
- [ ] Verify all tests pass
- **Requirements**: 1.1, 1.2, 1.3, 1.4

### 1.3 Create WSL Configuration
- [ ] Create `backend/mcp-server/src/config/wsl.config.ts`
- [ ] Define WSL distro name (Ubuntu)
- [ ] Define pose-service paths
- [ ] Define venv paths
- [ ] Define port numbers
- [ ] Add environment variables
- **Requirements**: 1.1, 1.2

---

## Phase 2: MCP Tools Implementation (2-3 hours)

### 2.1 Create File Operation Tools
- [ ] Create `backend/mcp-server/src/tools/wslFileTools.ts`
- [ ] Implement `readWslFile` tool
  - Input: path (string)
  - Output: content (string)
  - Error handling for missing files
- [ ] Implement `writeWslFile` tool
  - Input: path (string), content (string)
  - Output: success (boolean)
  - Error handling for permission denied
- [ ] Implement `listWslDirectory` tool
  - Input: path (string)
  - Output: files (FileInfo[])
  - Error handling for invalid directory
- [ ] Implement `deleteWslFile` tool
  - Input: path (string)
  - Output: success (boolean)
  - Error handling for protected files
- **Requirements**: 1.1, 1.2, 1.3, 1.4

### 2.2 Create Command Execution Tools
- [ ] Create `backend/mcp-server/src/tools/wslCommandTools.ts`
- [ ] Implement `runWslCommand` tool
  - Input: command (string), cwd (optional string)
  - Output: exitCode (number), stdout (string), stderr (string)
  - Timeout handling (30s max)
  - Error handling for dangerous commands
- [ ] Implement `runWslPython` tool
  - Input: script (string), args (optional string[])
  - Output: exitCode (number), stdout (string), stderr (string)
  - Automatically uses venv
  - Error handling for missing script
- **Requirements**: 2.1, 2.2, 2.3, 2.4

### 2.3 Create Service Management Tools
- [ ] Create `backend/mcp-server/src/tools/wslServiceTools.ts`
- [ ] Implement `startPoseService` tool
  - Output: success (boolean), message (string)
  - Error handling for already running
  - Error handling for startup failure
- [ ] Implement `stopPoseService` tool
  - Output: success (boolean), message (string)
  - Graceful shutdown
  - Error handling for not running
- [ ] Implement `getPoseServiceStatus` tool
  - Output: status (running|stopped|error), healthy (boolean)
  - Check health endpoint
  - Return port and uptime if running
- **Requirements**: 4.1, 4.2, 4.3, 4.4

### 2.4 Register Tools with MCP Server
- [ ] Update `backend/mcp-server/src/index.ts`
- [ ] Register all file tools
- [ ] Register all command tools
- [ ] Register all service tools
- [ ] Add tool descriptions and schemas
- [ ] Test tool registration
- **Requirements**: 1.1, 1.2, 2.1, 2.2, 4.1

---

## Phase 3: Integration with Kiro (1-2 hours)

### 3.1 Configure MCP in Kiro
- [ ] Update `.kiro/settings/mcp.json` (or create if missing)
- [ ] Add wsl-bridge MCP server configuration
- [ ] Set command to start MCP server
- [ ] Set autoApprove for safe tools (read operations)
- [ ] Test MCP server starts correctly
- **Requirements**: 1.1, 1.2, 2.1, 2.2

### 3.2 Test Tools in Kiro
- [ ] Open Kiro and verify MCP server connects
- [ ] Test `readWslFile` tool on existing file
- [ ] Test `writeWslFile` tool to create new file
- [ ] Test `runWslCommand` tool with simple command
- [ ] Test `getPoseServiceStatus` tool
- [ ] Verify all tools appear in Kiro's tool list
- **Requirements**: 1.1, 1.2, 2.1, 2.2, 4.3

### 3.3 Create Kiro Steering Guide
- [ ] Create `.kiro/steering/wsl-integration.md`
- [ ] Document available WSL tools
- [ ] Provide examples for common tasks
- [ ] Document best practices
- [ ] Document error handling
- **Requirements**: 1.1, 1.2, 2.1, 2.2

---

## Phase 4: Testing (1-2 hours)

### 4.1 Unit Tests
- [ ] Test WSL bridge path conversion
- [ ] Test file read/write with various content
- [ ] Test command execution with different commands
- [ ] Test error handling for invalid inputs
- [ ] Run all unit tests: `npm test`
- **Requirements**: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4

### 4.2 Integration Tests
- [ ] Test end-to-end file operations via MCP
- [ ] Test command execution via MCP
- [ ] Test service status via MCP
- [ ] Test with actual pose-service running
- [ ] Test error scenarios
- **Requirements**: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.3

### 4.3 Property-Based Tests
- [ ] **Property 1**: File read-write consistency
  - Write random content → read back → verify identical
- [ ] **Property 2**: Command execution reliability
  - Execute same command multiple times → verify consistent output
- [ ] **Property 3**: Path conversion correctness
  - Convert Windows path → WSL path → Windows path → verify original
- [ ] **Property 4**: Service state consistency
  - Start service → query status → verify running within 1s
- [ ] **Property 5**: Error handling robustness
  - Invalid operations → verify meaningful error messages
- **Requirements**: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3

### 4.4 Checkpoint: All Tests Pass
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Property tests pass
- [ ] No console errors
- [ ] MCP server starts without errors
- **Requirements**: All

---

## Phase 5: Documentation (1 hour)

### 5.1 Code Documentation
- [ ] Add JSDoc comments to all functions
- [ ] Document error handling
- [ ] Add inline comments for complex logic
- [ ] Create README for WSL bridge
- **Requirements**: 1.1, 1.2, 2.1, 2.2

### 5.2 User Documentation
- [ ] Update `.kiro/steering/wsl-integration.md`
- [ ] Add examples for common tasks
- [ ] Document tool schemas
- [ ] Document error messages
- [ ] Add troubleshooting guide
- **Requirements**: 1.1, 1.2, 2.1, 2.2

### 5.3 Update Design Doc
- [ ] Document final implementation
- [ ] Include code snippets
- [ ] Document any deviations from design
- [ ] Add performance metrics
- **Requirements**: 1.1, 1.2, 2.1, 2.2

---

## Phase 6: Validation (1 hour)

### 6.1 End-to-End Workflow
- [ ] Use Kiro to read file from WSL
- [ ] Use Kiro to modify file on WSL
- [ ] Use Kiro to run command on WSL
- [ ] Use Kiro to check pose service status
- [ ] Verify all operations work correctly
- **Requirements**: 1.1, 1.2, 2.1, 2.2, 4.3

### 6.2 Error Scenarios
- [ ] Try to read non-existent file → verify error
- [ ] Try to write to protected directory → verify error
- [ ] Try to run invalid command → verify error
- [ ] Try to access service when stopped → verify error
- **Requirements**: 1.4, 2.4, 4.4

### 6.3 Performance Testing
- [ ] Measure file read time (target: <100ms)
- [ ] Measure file write time (target: <100ms)
- [ ] Measure command execution time (target: <1s)
- [ ] Measure service status check time (target: <500ms)
- **Requirements**: Performance

---

## Estimated Timeline

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| 1 | WSL Bridge | 2-3 | Not started |
| 2 | MCP Tools | 2-3 | Not started |
| 3 | Kiro Integration | 1-2 | Not started |
| 4 | Testing | 1-2 | Not started |
| 5 | Documentation | 1 | Not started |
| 6 | Validation | 1 | Not started |
| **Total** | | **8-12** | |

---

## Success Criteria

- [ ] WSL bridge executes commands correctly
- [ ] File read/write operations work
- [ ] MCP tools are registered and accessible in Kiro
- [ ] Kiro can read files from WSL
- [ ] Kiro can write files to WSL
- [ ] Kiro can execute commands on WSL
- [ ] Kiro can check pose service status
- [ ] All tests pass
- [ ] Error handling is robust
- [ ] Documentation is complete

---

## Next Steps After Path A

Once Path A is complete, you can:

1. **Upgrade to Path B** (File Sync):
   - Add automatic file sync between Windows and WSL
   - Detect file changes on both sides
   - Handle conflicts

2. **Upgrade to Path C** (Full Integration):
   - Add ViTDet setup automation
   - Add service start/stop from Kiro
   - Add real-time log streaming

3. **Use for Mesh Projection Fix**:
   - Use Kiro to edit Python files on WSL
   - Use Kiro to run tests on WSL
   - Use Kiro to manage ViTDet setup

---

## Notes

- WSL must be installed and Ubuntu distro available
- MCP server runs on Windows, communicates with WSL via `wsl.exe`
- All file paths should be absolute
- Commands execute with default shell (bash)
- Service management assumes pose-service is at `/home/user/pose-service`
- Adjust paths in `wsl.config.ts` if different
