# PTC Action Annotation Labels v2

This label set captures the three operator actions requested for the bale inspection workflow.

## Labels

### CUT_ROPES
Operator actively cuts or severs the rope/twine securing the bale.

- Start: first frame where cutting tool/hand engages the securing rope for a cut.
- End: frame where the targeted rope is visibly severed or cutting action stops.
- Exclude: idle tool holding, touching twine without cutting, ambiguous occluded handling.

### HAND_INSPECTION
Operator manually examines exposed tobacco by sustained hand contact/manipulation.

- Start: first deliberate inspection contact with exposed tobacco.
- End: deliberate inspection contact stops or the inspection surface becomes materially occluded.
- Exclude: incidental touch, bale repositioning, rope handling.

### CLOSE_ROPES
Operator repositions, pulls, ties, tightens, or otherwise re-secures rope/twine on the bale after inspection.

- Start: first deliberate re-securing action on rope/twine after the inspection/open state.
- End: rope/twine is visibly secured/tightened or re-securing action stops.
- Exclude: cutting/removing rope, loose twine handling not clearly part of re-closing, ambiguous handling.

## Sequence rule

Expected complete workflow when all three actions are visible:

`CUT_ROPES -> HAND_INSPECTION -> CLOSE_ROPES`

Do not infer a missing action. If the beginning or end of the process is outside the clip, annotate only what is directly visible.

## Confidence and visibility

Each segment should include:

- `confidence`: high / medium / low
- `visibility`: clear / partial / insufficient
- `training_use`: eligible / candidate / exclude
- a short evidence note

Ambiguous segments must remain unresolved rather than being forced into one of the three target labels.
