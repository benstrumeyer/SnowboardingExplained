---
inclusion: manual
---

# WSL-Kiro Integration Guide

This guide explains how to use Kiro to access and manage files on WSL.

## Available Tools

### File Operations

#### readWslFile
Read a file from WSL filesystem.

**Usage**:
```
Read the file /home/user/pose-service/app.py from WSL
```

**Parameters**:
- `path` (required): File path in WSL (e.g., `/home/user/file.txt`)

**Returns**:
- `success`: Whether the operation succeeded
- `content`: File content
- `size`: File size in bytes

#### writeWslFile
Write a file to WSL filesystem.

**Usage**:
```
Write the following content to /home/user/test.py:
print("Hello from WSL")
```

**Parameters**:
- `path` (required): File path in WSL
- `content` (required): File content to write

**Returns**:
- `success`: Whether the operation succeeded
- `message`: Status message

#### listWslDirectory
List files in a WSL directory.

**Usage**:
```
List the files in /home/user/pose-service
```

**Parameters**:
- `path` (required): Directory path in WSL

**Returns**:
- `success`: Whether the operation succeeded
- `files`: Array of file info objects
- `count`: Number of files

#### deleteWslFile
Delete a file from WSL filesystem.

**Usage**:
```
Delete the file /home/user/test.py
```

**Parameters**:
- `path` (required): File path in WSL

**Returns**:
- `success`: Whether the operation succeeded
- `message`: Status message

### Command Execution

#### runWslCommand
Run a command in WSL.

**Usage**:
```
Run the command: ls -la /home/user/pose-service
```

**Parameters**:
- `command` (required): Command to run
- `cwd` (optional): Working directory

**Returns**:
- `success`: Whether the command succeeded
- `exitCode`: Command exit code
- `stdout`: Standard output
- `stderr`: Standard error

#### runWslPython
Run a Python script in WSL venv.

**Usage**:
```
Run the Python script /home/user/pose-service/test.py with arguments arg1 arg2
```

**Parameters**:
- `script` (required): Python script path
- `args` (optional): Script arguments
- `cwd` (optional): Working directory

**Returns**:
- `success`: Whether the script succeeded
- `exitCode`: Script exit code
- `stdout`: Standard output
- `stderr`: Standard error

#### installWslPackage
Install a Python package in WSL venv.

**Usage**:
```
Install the package numpy in the WSL venv
```

**Parameters**:
- `package` (required): Package name or requirement (e.g., `numpy`, `torch==1.9.0`)

**Returns**:
- `success`: Whether the installation succeeded
- `exitCode`: pip exit code
- `stdout`: Installation output
- `stderr`: Error output

#### getWslPythonVersion
Get Python version in WSL venv.

**Usage**:
```
What is the Python version in the WSL venv?
```

**Returns**:
- `success`: Whether the operation succeeded
- `version`: Python version string

### Service Management

#### startPoseService
Start the pose service on WSL.

**Usage**:
```
Start the pose service
```

**Returns**:
- `success`: Whether the service started
- `message`: Status message
- `port`: Service port
- `url`: Service URL

#### stopPoseService
Stop the pose service on WSL.

**Usage**:
```
Stop the pose service
```

**Returns**:
- `success`: Whether the service stopped
- `message`: Status message

#### getPoseServiceStatus
Get the status of the pose service.

**Usage**:
```
Is the pose service running?
```

**Returns**:
- `success`: Whether the operation succeeded
- `status`: Service status (running/stopped)
- `healthy`: Whether the service is healthy
- `port`: Service port
- `url`: Service URL

#### getPoseServiceLogs
Get recent logs from the pose service.

**Usage**:
```
Show me the last 50 lines of the pose service logs
```

**Parameters**:
- `lines` (optional): Number of lines to return (default: 100)

**Returns**:
- `success`: Whether the operation succeeded
- `logs`: Log content
- `lines`: Number of lines returned

#### restartPoseService
Restart the pose service on WSL.

**Usage**:
```
Restart the pose service
```

**Returns**:
- `success`: Whether the service restarted
- `message`: Status message
- `port`: Service port
- `url`: Service URL

## Common Tasks

### Edit a Python File on WSL

1. Read the file:
   ```
   Read /home/user/pose-service/app.py
   ```

2. Make changes to the content

3. Write the file back:
   ```
   Write the modified content to /home/user/pose-service/app.py
   ```

### Run Tests on WSL

1. Run a test script:
   ```
   Run the Python script /home/user/pose-service/test_crop_projection.py
   ```

2. Check the output for results

### Check Service Status

1. Get service status:
   ```
   Is the pose service running?
   ```

2. If not running, start it:
   ```
   Start the pose service
   ```

3. Check logs if there are issues:
   ```
   Show me the last 100 lines of the pose service logs
   ```

### Install Dependencies

1. Install a package:
   ```
   Install numpy in the WSL venv
   ```

2. Verify installation:
   ```
   Run the Python script /home/user/pose-service/test.py
   ```

## Best Practices

1. **Always check service status before making changes**
   - Use `getPoseServiceStatus` to verify the service is running
   - Stop the service before making major changes

2. **Use absolute paths**
   - Always use absolute paths (e.g., `/home/user/file.txt`)
   - Relative paths may not work as expected

3. **Check command output**
   - Always review stdout and stderr from commands
   - Look for error messages if something fails

4. **Backup important files**
   - Before making changes, read and save the original content
   - This allows you to revert if needed

5. **Use meaningful commit messages**
   - When making changes, document what you're doing
   - This helps with debugging later

## Troubleshooting

### "WSL not available" error
- Ensure WSL is installed and Ubuntu distro is available
- Check that `wsl.exe` is in your PATH

### "File not found" error
- Verify the file path is correct
- Use `listWslDirectory` to check if the file exists

### "Permission denied" error
- Check file permissions in WSL
- You may need to use `sudo` for some operations

### Service won't start
- Check the logs: `Show me the last 100 lines of the pose service logs`
- Verify the port is not already in use
- Check that all dependencies are installed

### Command timeout
- Some commands may take longer than 30 seconds
- Try breaking the command into smaller steps
- Check the service logs for more details

## Examples

### Example 1: Edit and Test a Python File

```
1. Read /home/user/pose-service/crop_projection.py
2. [Make changes to the content]
3. Write the modified content to /home/user/pose-service/crop_projection.py
4. Run the Python script /home/user/pose-service/test_crop_projection.py
5. Check the output for test results
```

### Example 2: Install and Verify a Package

```
1. Install torch in the WSL venv
2. Run the Python script /home/user/pose-service/test_torch.py
3. Check the output to verify torch is working
```

### Example 3: Restart Service and Check Status

```
1. Restart the pose service
2. Is the pose service running?
3. Show me the last 50 lines of the pose service logs
```

## Next Steps

- Use these tools to edit Python files on WSL
- Run tests and verify changes
- Manage the pose service from Kiro
- Automate common tasks

For more information, see the WSL-Kiro Integration spec:
- `.kiro/specs/wsl-kiro-integration/requirements.md`
- `.kiro/specs/wsl-kiro-integration/design.md`
- `.kiro/specs/wsl-kiro-integration/tasks.md`
