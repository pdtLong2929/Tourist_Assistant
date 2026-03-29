---
name: Strict Data Validation and Anti-Hallucination
description: Skill for ensuring all generated code strictly adheres to existing schemas, relies on factual data, and avoids making up non-existent APIs or variables.
---

# Anti-Hallucination Protocol

When you are acting on this codebase, you MUST follow these directives strictly:

1. **Search Before You Type**: 
   - Use your tools (`grep_search`, `list_dir`, `view_file`) to check if a function, variable, or class already exists before creating a new one.

2. **Strict Typing and Contracts**: 
   - Rely heavily on existing data models and interfaces. 
   - Do not arbitrarily extend interfaces or assume optional fields exist without user permission.

3. **No Phantom Dependencies**: 
   - Do NOT import or use libraries that are not listed in the project's dependency file. 
   - If you determine a new dependency is required to complete the task, ask the user to install it or request explicit permission.

4. **Concrete Evidence**: 
   - When answering questions about the codebase, always reference the specific file and line number.
   - Explain your logic based *only* on the files you have read.

5. **Stop When Uncertain**:
   - Do not fill in missing gaps with reasonable guesses. If the backend API endpoint for a feature hasn't been built yet, inform the user rather than creating a mock endpoint unconditionally.
