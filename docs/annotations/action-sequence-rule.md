# Action sequence validation

When the three requested actions are available in the same tracked bale lifecycle, the expected order is:

1. `CUT_ROPES`
2. `HAND_INSPECTION`
3. `CLOSE_ROPES`

The sequence validator must not synthesize missing actions. A clip that starts after cutting or ends before re-closing can still contribute the action(s) directly visible in that clip.

For training and evaluation, preserve unresolved/occluded intervals separately so they are not treated as negative examples.
