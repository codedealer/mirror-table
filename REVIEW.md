## Brower use policy

When designing/re-styling a frontend component or working on a feature that changes user experience, review agent must conduct a live browser review in the environments where such tools are available, e.g. using Orca browser or VS Code's browser tool.

## Firestore schema changes

When changing the Firestore schema, security rules must be considered before deploy and testing the changes if the entities are added or deleted. Changing the properties is generally fine, but those properties might also be used in the security rules, so such schema changes must be authorized prior to the review.

