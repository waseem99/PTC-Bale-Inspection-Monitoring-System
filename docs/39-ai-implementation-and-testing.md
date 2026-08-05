# AI Implementation and Testing Baseline

## Status

The repository now contains a complete testable implementation framework for the finalized PTC bale workflow. It includes deterministic SOP logic, routing, OCR stabilization, hand-inspection classification, runtime adapters, training/export commands, platform event mapping, CI, and tests.

Actual AI accuracy remains dependent on restricted inputs that cannot be generated from source code alone:

- approved factory videos and permissions;
- versioned annotations and leakage-safe dataset manifests;
- trained PTC model weights;
- final grading observability decision;
- actual camera/ROI configuration;
- locked evaluation labels and acceptance thresholds.

## Finalized sequence

```text
BALE_ENTERED
→ BALE_OPENED
→ HAND_INSPECTION_COMPLETED
→ GRADING_COMPLETED
→ ROUTED_ACCEPTED_OR_REJECTED
→ WEIGHT_RECORDED_BY_OCR
→ INSPECTION_COMPLETED
```

Left-side routing is rejected. Direct scale integration is outside the present scope.

## Implementation components

| Component | Baseline |
|---|---|
| Detection | Custom YOLOv11, exact size selected by PTC evaluation |
| Tracking | ByteTrack; BoT-SORT only if justified by occlusion testing |
| Hand inspection | MediaPipe/RTMPose observations plus duration/motion; ST-GCN may replace or supplement after labeled evaluation |
| Grading | Visible state/artifact/action signal only where labelable |
| Routing | Versioned accepted and left-side rejected ROIs |
| Weight | Display crop, preprocessing, OCR, temporal stabilization |
| Decision | Versioned deterministic SOP and anomaly engine |
| Delivery | Existing edge spool, API, PostgreSQL, evidence and dashboard |

## Test gates before video testing

1. Run AI Pipeline CI and all unit tests.
2. Complete issue #27 coverage audit.
3. Freeze #28 annotations and a pilot QA batch.
4. Build leakage-safe dataset v1 under #29.
5. Train detector and any temporal classifier using restricted storage.
6. Replace example configuration with approved camera ROIs and thresholds.
7. Run the locked component and event-level evaluation from #34.
8. Only then report accuracy or proceed to actual-camera acceptance.

## Expected first testing outputs

- one event per temporary Bale ID;
- completed, missed, incomplete or unresolved outcome;
- specific anomaly reason code;
- ordered step statuses and timestamps;
- route and OCR weight metadata;
- model, rule and configuration versions;
- protected evidence reference.
