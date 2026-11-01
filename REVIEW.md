## Best practices

New code must adhere to industry best practices and the adopted in the project patterns. UI elements must use the adopted framework components first, and only introduce new ones if the bundled components cannot be reasonably configured to achieve the desired functionality. Styling of the new components must share the same principles, UX and color scheme as the adopted framework's components.

## Brower use policy

When designing/re-styling a frontend component or working on a feature that changes user experience, review agent must conduct a live browser review in the environments where such tools are available, e.g. using Orca browser or VS Code's browser.

Tool availability:

- check `ORCA_CLI_COMMAND` environment variable: non-empty value means Orca browser is available through the Orca binary, use the appropriate skill;
- VS Code's browser is exposed via MCP tool;

## Firestore schema changes

When changing the Firestore schema, security rules must be considered before deploy and testing the changes if the entities are added or deleted. Changing the properties is generally fine, but those properties might also be used in the security rules, so such schema changes must be authorized prior to the review.

