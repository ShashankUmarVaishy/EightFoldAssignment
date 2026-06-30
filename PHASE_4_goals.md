Task: Implement Phase 4 - Command-Line Interface (CLI), Test Verification Suite, and Complete Documentation

Context:
Our core transformation pipeline and runtime projection layers are working flawlessly. We must now package the platform into a production CLI tool and deliver complete execution documentation. Refer to our main architecture blueprints to verify delivery requirements.

Instructions for Code Generation:
1. Create our CLI interface application entry point in `/src/cli.js` using the `commander` library. Secure clean flag definitions for inputs, configuration mappings, and destination outputs.
2. Ensure the script catches file-system or malformed configuration errors gracefully, logging concise diagnostics to the console without dumping unhandled stack traces.
3. Establish a test verification runner that builds the default schema JSON and at least one custom-configured schema JSON output utilizing our provided multi-source inputs. Include a quick snapshot evaluation test to cross-reference outputs against our expected profiles.
4. Compose a comprehensive root-level `README.md` detailing quickstart operations, dependency setups, clear CLI application invocation examples, and explicit processing assumptions or descoped components.

Acknowledge these final packaging bounds by producing an Antigravity Interface Deployment Artifact. Wait for my confirmation block before finalizing our workspace code files.