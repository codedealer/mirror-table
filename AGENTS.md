## UI practices

Prefer Vuestic components to plain HTML, only design new component if the UI library's customization isn't enough to achieve the goal.

### Design philosophy

In Owner mode, which is the target for the interface, screen real estate is extremely expensive. There is a lot of information to display, and the majority of the screen is taken by Scene stage. So your task is to maximize the utilization of the rest of the space, using a mix of the best UX practices and new creative approaches. Experimentation can be done in dev-prototype lab. While designing UI ask yourself: how can this component show the most amount of information while taking the least possible space?

Respect visual hierarchy.

Don't use `primary` button on secondary elements (popups, multi-panels). For large buttons prefer `primary-dark` as it has better contrast. Where space is limited, prefer using naked icon buttons with auxiliary text as either a tooltip or a title. Icon buttons are allowed to have `primary` color, non-critical components should still use `primary-dark` or `secondary`.