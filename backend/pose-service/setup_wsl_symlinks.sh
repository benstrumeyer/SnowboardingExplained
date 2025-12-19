#!/bin/bash
# Setup symlinks from WSL ~/pose-service to Windows files
# This allows edits in Kiro (Windows) to immediately reflect in WSL
# 
# Strategy: Symlink ALL files from Windows, keep venv and __pycache__ local
# New files created in Windows will automatically be accessible via symlinks

set -e

WINDOWS_PATH="/mnt/c/Users/benja/repos/SnowboardingExplained/backend/pose-service"
WSL_PATH="$HOME/pose-service"

echo "=============================================="
echo "Setting up WSL symlinks for pose-service"
echo "=============================================="
echo "Windows source: $WINDOWS_PATH"
echo "WSL target: $WSL_PATH"
echo ""

# Check if Windows path exists
if [ ! -d "$WINDOWS_PATH" ]; then
    echo "ERROR: Windows path does not exist: $WINDOWS_PATH"
    exit 1
fi

# Create WSL directory if it doesn't exist
mkdir -p "$WSL_PATH"
cd "$WSL_PATH"

# Directories to keep local (not symlink)
LOCAL_DIRS=("venv" "__pycache__" "chumpy_src" "data" ".git")

# Function to check if item should be kept local
should_keep_local() {
    local item="$1"
    for local_dir in "${LOCAL_DIRS[@]}"; do
        if [ "$item" == "$local_dir" ]; then
            return 0  # true, keep local
        fi
    done
    return 1  # false, should symlink
}

echo "Syncing all files from Windows to WSL..."
echo ""

# Process all items in Windows directory
for item in "$WINDOWS_PATH"/*; do
    basename=$(basename "$item")
    
    # Skip items that should stay local
    if should_keep_local "$basename"; then
        echo "KEEP LOCAL: $basename"
        continue
    fi
    
    # Handle existing items in WSL
    if [ -e "$WSL_PATH/$basename" ] || [ -L "$WSL_PATH/$basename" ]; then
        if [ -L "$WSL_PATH/$basename" ]; then
            # Already a symlink, check if pointing to right place
            current_target=$(readlink "$WSL_PATH/$basename")
            if [ "$current_target" == "$item" ]; then
                echo "OK (symlink): $basename"
                continue
            else
                echo "UPDATE symlink: $basename"
                rm "$WSL_PATH/$basename"
            fi
        else
            # Regular file/dir, backup and replace
            echo "BACKUP: $basename -> $basename.bak"
            mv "$WSL_PATH/$basename" "$WSL_PATH/$basename.bak"
        fi
    fi
    
    # Create symlink
    echo "SYMLINK: $basename -> $item"
    ln -s "$item" "$WSL_PATH/$basename"
done

echo ""
echo "=============================================="
echo "Symlink setup complete!"
echo "=============================================="
echo ""
echo "Current state:"
ls -la "$WSL_PATH" | head -30
echo ""
echo "Symlinked files (pointing to Windows):"
find "$WSL_PATH" -maxdepth 1 -type l -exec ls -la {} \; 2>/dev/null | wc -l
echo " symlinks created"
echo ""
echo "Now restart the pose service:"
echo "  cd $WSL_PATH"
echo "  source venv/bin/activate" 
echo "  python app.py"
echo ""
echo "Any NEW files you create in Windows will automatically appear here!"
