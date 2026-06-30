Task: Implement Phase 3 - Dynamic Projection Layer & Configuration-Driven Remapping

Context:
Phase 2 successfully outputs a consistent internal canonical record. We must now build the isolated runtime configuration projection engine wrapper. Refer to our main specification requirements file to maintain structural alignment.

Instructions for Code Generation:
1. Create a dedicated module `/src/projector/projectionLayer.js`. 
2. Implement an object mapper using `lodash/get` and `lodash/set` to dynamically evaluate string-based path pointers (e.g., parsing 'emails[0]' and mapping it to a custom runtime key path like 'primary_email').
3. Integrate strict conditional evaluations for the configuration's 'on_missing' parameter directives, handling 'null', 'omit', and throwing precise exceptions for 'error' parameters.
4. Integrate a runtime schema verification utility using Zod. This utility must evaluate the finalized reshaped output object against the requested configuration structure before outputting the stringified JSON.
5. Ensure the design completely separates our internal canonical schema processing logic from this dynamic formatting projection layer.

Acknowledge these architecture parameters by generating an Antigravity Implementation Plan Artifact. Wait for my code review and authorization before generating the script execution blocks.