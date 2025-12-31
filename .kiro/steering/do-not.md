# Do NOT

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## Critical Constraints

### ❌ Do NOT Make Documentation or .md Files

- Do not create new `.md` files unless explicitly requested
- Do not add comments or docstrings to code
- Do not create README files
- Do not generate setup guides or tutorials
- Do not write explanatory documentation

**Why:** Focus is on code and functionality, not documentation. All guidance is in `.kiro/steering/`.

### ❌ Do NOT Change Dependency Versions

- Do not update `requirements.txt` versions
- Do not upgrade PyTorch, detectron2, ViTDet, 4D-Humans, or PHALP
- Do not modify `package.json` versions
- Do not install newer versions of frozen dependencies
- Do not use `pip install --upgrade`

**Why:** Frozen stack is tightly coupled. Version changes break compatibility.

## What TO Do Instead

### For Documentation Needs
- Update existing `.kiro/steering/` files only
- Keep changes minimal and focused
- Reference existing docs instead of creating new ones

### For Dependency Issues
- Work with existing versions
- Check installation order in `dependency-setup.md`
- Verify virtual environment is activated
- Use `pip install -e .` for local packages
- Contact team if version conflicts occur

## Allowed Actions

✅ **Code Changes**
- Modify Python files in `backend/pose-service/`
- Modify TypeScript files in `backend/src/`
- Fix bugs and implement features
- Add imports and dependencies (don't change versions)

✅ **Configuration**
- Update `.env` files
- Modify server settings
- Adjust processing parameters
- Change port numbers if needed

✅ **Testing**
- Run tests and debug
- Check logs and output
- Verify functionality
- Monitor performance

✅ **Steering Updates**
- Update existing `.kiro/steering/` files only
- Keep updates concise and focused
- Maintain version headers

## Enforcement

These constraints are **non-negotiable** for MVP stability. Violations will break:
- Dependency compatibility
- Team onboarding
- Reproducible builds
- Version control clarity

**When in doubt, ask first.**
