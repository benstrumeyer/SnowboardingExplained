# WSL-Kiro Integration - Requirements

## Introduction

Enable Kiro to directly modify and access files on the WSL server running the pose-service. This allows Kiro to edit Python code, run tests, and manage the ViTDet setup without manual file transfers or SSH commands.

## Glossary

- **MCP Server**: Model Context Protocol server that exposes tools to Kiro
- **WSL**: Windows Subsystem for Linux running Ubuntu
- **Pose Service**: Python Flask app running in WSL for mesh rendering
- **File Bridge**: Tool that reads/writes files on WSL from Kiro
- **Command Bridge**: Tool that executes commands on WSL from Kiro

## Requirements

### Requirement 1: WSL File Access

**User Story:** As a developer, I want Kiro to read and write files on WSL, so that I can edit code without manual transfers.

#### Acceptance Criteria

1. WHEN Kiro requests to read a file THEN the system SHALL read from WSL filesystem and return content
2. WHEN Kiro requests to write a file THEN the system SHALL write to WSL filesystem atomically
3. WHEN Kiro requests to list directory THEN the system SHALL return directory contents from WSL
4. WHEN file path is invalid THEN the system SHALL return error with helpful message
5. WHEN file is too large (>10MB) THEN the system SHALL handle gracefully or stream in chunks

### Requirement 2: WSL Command Execution

**User Story:** As a developer, I want Kiro to run commands on WSL, so that I can execute tests and setup scripts.

#### Acceptance Criteria

1. WHEN Kiro requests to run a command THEN the system SHALL execute on WSL and return stdout/stderr
2. WHEN command times out (>30s) THEN the system SHALL terminate and return partial output
3. WHEN command fails THEN the system SHALL return exit code and error message
4. WHEN command requires input THEN the system SHALL support stdin
5. WHEN command is dangerous (rm -rf /) THEN the system SHALL reject with warning

### Requirement 3: Python Environment Management

**User Story:** As a developer, I want Kiro to manage the Python venv on WSL, so that I can install packages and run scripts.

#### Acceptance Criteria

1. WHEN Kiro requests to install package THEN the system SHALL run pip install in venv
2. WHEN Kiro requests to run Python script THEN the system SHALL execute in venv context
3. WHEN venv doesn't exist THEN the system SHALL create it
4. WHEN package installation fails THEN the system SHALL return error with logs
5. WHEN Kiro requests Python version THEN the system SHALL return version info

### Requirement 4: Pose Service Control

**User Story:** As a developer, I want Kiro to start/stop the pose service, so that I can manage the server without manual commands.

#### Acceptance Criteria

1. WHEN Kiro requests to start pose service THEN the system SHALL start Flask app on port 5000
2. WHEN Kiro requests to stop pose service THEN the system SHALL gracefully shutdown
3. WHEN Kiro requests service status THEN the system SHALL return running/stopped state
4. WHEN service fails to start THEN the system SHALL return error logs
5. WHEN service is already running THEN the system SHALL return status without restarting

### Requirement 5: ViTDet Setup Automation

**User Story:** As a developer, I want Kiro to automate ViTDet setup on WSL, so that I don't have to run commands manually.

#### Acceptance Criteria

1. WHEN Kiro requests ViTDet setup THEN the system SHALL install detectron2 and dependencies
2. WHEN Kiro requests to download ViTDet model THEN the system SHALL download weights (~500MB)
3. WHEN Kiro requests to test ViTDet THEN the system SHALL run detection on test image
4. WHEN setup fails THEN the system SHALL return detailed error logs
5. WHEN setup succeeds THEN the system SHALL verify installation with test

### Requirement 6: Real-Time Logs

**User Story:** As a developer, I want Kiro to stream logs from the pose service, so that I can debug issues in real-time.

#### Acceptance Criteria

1. WHEN Kiro requests logs THEN the system SHALL stream recent logs from pose service
2. WHEN new logs are generated THEN the system SHALL push updates to Kiro
3. WHEN Kiro requests to follow logs THEN the system SHALL stream in real-time
4. WHEN log file is large THEN the system SHALL return last N lines (default 100)
5. WHEN service crashes THEN the system SHALL capture crash logs

### Requirement 7: File Sync

**User Story:** As a developer, I want Kiro to sync files between Windows and WSL, so that I can work in either environment.

#### Acceptance Criteria

1. WHEN Kiro modifies file on Windows THEN the system SHALL sync to WSL
2. WHEN WSL file is modified THEN the system SHALL detect and notify Kiro
3. WHEN conflict occurs (both modified) THEN the system SHALL prompt for resolution
4. WHEN directory is synced THEN the system SHALL handle all files recursively
5. WHEN sync fails THEN the system SHALL return error and rollback

## Implementation Paths

### Path A: Simple MCP Server (Recommended)
- Direct WSL file/command access via MCP tools
- No sync, manual file management
- Time: 4-6 hours
- Complexity: Medium

### Path B: MCP + File Sync
- MCP server + automatic file sync
- Bidirectional sync between Windows and WSL
- Time: 8-10 hours
- Complexity: High

### Path C: Full Integration (Advanced)
- MCP server + file sync + service control + ViTDet automation
- Complete WSL management from Kiro
- Time: 12-16 hours
- Complexity: Very High

## Recommendation

**Start with Path A** because:
1. Enables Kiro to access/modify files immediately
2. Provides foundation for Path B/C
3. Can be extended incrementally
4. Lower risk and faster to implement
