# WSL-Kiro Integration - Quick Start

**Status**: ✅ Ready to Use

---

## What You Can Do Now

With WSL-Kiro integration, you can:
- ✅ Read and write files on WSL from Kiro
- ✅ Run commands on WSL from Kiro
- ✅ Run Python scripts in the WSL venv
- ✅ Install packages on WSL
- ✅ Start/stop/restart the pose service
- ✅ Check service status and logs

---

## Getting Started

### 1. Verify WSL is Available

Ask Kiro:
```
Is WSL available? Run a simple command to check.
```

### 2. List Files on WSL

Ask Kiro:
```
List the files in /home/user/pose-service
```

### 3. Read a File

Ask Kiro:
```
Read the file /home/user/pose-service/app.py
```

### 4. Edit a File

Ask Kiro:
```
Read /home/user/pose-service/crop_projection.py
```

Then after making changes:
```
Write the modified content to /home/user/pose-service/crop_projection.py
```

### 5. Run a Command

Ask Kiro:
```
Run the command: ls -la /home/user/pose-service
```

### 6. Run a Python Script

Ask Kiro:
```
Run the Python script /home/user/pose-service/test_crop_projection.py
```

### 7. Check Service Status

Ask Kiro:
```
Is the pose service running?
```

### 8. Start the Service

Ask Kiro:
```
Start the pose service
```

### 9. Get Service Logs

Ask Kiro:
```
Show me the last 100 lines of the pose service logs
```

---

## Common Workflows

### Workflow 1: Edit and Test a Python File

1. **Read the file**:
   ```
   Read /home/user/pose-service/crop_projection.py
   ```

2. **Make changes** (in Kiro)

3. **Write the file back**:
   ```
   Write the modified content to /home/user/pose-service/crop_projection.py
   ```

4. **Run tests**:
   ```
   Run the Python script /home/user/pose-service/test_crop_projection.py
   ```

5. **Check results** (review output)

### Workflow 2: Install and Verify a Package

1. **Install package**:
   ```
   Install numpy in the WSL venv
   ```

2. **Verify installation**:
   ```
   Run the Python script /home/user/pose-service/test_numpy.py
   ```

3. **Check output** (verify it works)

### Workflow 3: Restart Service and Check Status

1. **Restart service**:
   ```
   Restart the pose service
   ```

2. **Check status**:
   ```
   Is the pose service running?
   ```

3. **Get logs if needed**:
   ```
   Show me the last 50 lines of the pose service logs
   ```

---

## Available Tools

### File Tools
- `readWslFile` - Read files
- `writeWslFile` - Write files
- `listWslDirectory` - List directories
- `deleteWslFile` - Delete files

### Command Tools
- `runWslCommand` - Run commands
- `runWslPython` - Run Python scripts
- `installWslPackage` - Install packages
- `getWslPythonVersion` - Get Python version

### Service Tools
- `startPoseService` - Start service
- `stopPoseService` - Stop service
- `getPoseServiceStatus` - Check status
- `getPoseServiceLogs` - Get logs
- `restartPoseService` - Restart service

---

## Tips

1. **Always use absolute paths**
   - Good: `/home/user/pose-service/app.py`
   - Bad: `./app.py`

2. **Check service status before making changes**
   - Stop the service before major changes
   - Restart after making changes

3. **Review command output**
   - Check stdout and stderr
   - Look for error messages

4. **Use meaningful file names**
   - Makes it easier to track changes
   - Helps with debugging

5. **Keep backups**
   - Read and save original content before editing
   - Allows you to revert if needed

---

## Troubleshooting

### "WSL not available"
- Ensure WSL is installed
- Check Ubuntu distro is available
- Verify `wsl.exe` is in PATH

### "File not found"
- Verify the path is correct
- Use `listWslDirectory` to check
- Check file permissions

### "Permission denied"
- Check file permissions in WSL
- May need to use `sudo` for some operations

### Service won't start
- Check logs: `Show me the last 100 lines of the pose service logs`
- Verify port is not in use
- Check dependencies are installed

### Command timeout
- Some commands may take >30 seconds
- Try breaking into smaller steps
- Check logs for details

---

## Next Steps

1. **Use the tools to edit Python files on WSL**
   - Edit crop_projection.py
   - Edit hybrid_pose_detector.py
   - Edit other pose service files

2. **Run tests and verify changes**
   - Run test_crop_projection.py
   - Run other test scripts
   - Check output for errors

3. **Manage the pose service**
   - Start/stop as needed
   - Check status regularly
   - Monitor logs for issues

4. **Automate common tasks**
   - Create scripts for repetitive tasks
   - Use Kiro to run them
   - Save time and reduce errors

---

## Examples

### Example 1: Fix a Bug in Python Code

```
1. Read /home/user/pose-service/crop_projection.py
2. [Identify and fix the bug]
3. Write the corrected code to /home/user/pose-service/crop_projection.py
4. Run the Python script /home/user/pose-service/test_crop_projection.py
5. Verify the tests pass
```

### Example 2: Add a New Feature

```
1. Read /home/user/pose-service/hybrid_pose_detector.py
2. [Add the new feature]
3. Write the updated code to /home/user/pose-service/hybrid_pose_detector.py
4. Run tests to verify it works
5. Restart the pose service
6. Check service status
```

### Example 3: Debug an Issue

```
1. Is the pose service running?
2. Show me the last 100 lines of the pose service logs
3. [Identify the issue from logs]
4. Read the relevant Python file
5. [Fix the issue]
6. Write the corrected code
7. Restart the pose service
8. Check status and logs again
```

---

## For More Information

- See `.kiro/steering/wsl-integration.md` for detailed tool documentation
- See `.kiro/specs/wsl-kiro-integration/design.md` for architecture details
- See `.kiro/specs/wsl-kiro-integration/IMPLEMENTATION_COMPLETE.md` for implementation details

---

## Ready to Go!

You're all set to use WSL-Kiro integration. Start by asking Kiro to list files on WSL or check the service status.

**Happy coding!** 🚀
