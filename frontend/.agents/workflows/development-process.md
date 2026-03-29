---
description: Development process with strict anti-hallucination measures
---
1. **Context Gathering Phase**:
   - Use the `list_dir` tool to understand the project structure.
   - Use the `view_file` tool to read `package.json`, `requirements.txt`, or similar to identify the exact technology stack.
   - Use `grep_search` to find existing data models or API routes before writing any new code.

2. **Schema Verification Phase**:
   - Check if database schemas, API contracts, or interface types exist for the feature.
   - If they do not exist, draft a proposed schema and use the `implementation_plan.md` artifact to get user approval.
   - **Crucial**: Do not hallucinate database columns, API endpoints, or external services without user confirmation or existing code reference.

3. **Implementation Phase**:
   - Implement the feature using the exact variable names, tables, and API types defined in the previous step.
   - Do not mock data unless explicitly requested; use the actual database clients or API fetchers present in the codebase.
   - Do not invent new dependencies. Only use libraries already installed or explicitly approved by the user.

4. **Testing and Verification Phase**:
   - Write unit/integration tests for the newly added feature.
   - Execute the tests and verify they pass using the `run_command` tool.
   - If tests fail, diagnose the error solely from the command output. Do not guess the failure reason.
