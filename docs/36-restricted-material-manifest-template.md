# Restricted Factory-Material Manifest Template

Use this template only for **sanitized planning records**. Store the actual files and sensitive metadata in the approved restricted location, not GitHub.

## Material register

| Reference ID | Source date/session | Proposed camera/view | Duration | Resolution/FPS | Scenario | Visibility quality | Permitted use | Intended split | Restricted storage reference | Access owner | Retention status | Notes/gaps |
|---|---|---|---:|---|---|---|---|---|---|---|---|---|
| `PTC-MAT-____` | `YYYY-MM-DD / shift` | `CAM-__ / view` | `__ min` | `____` | `normal / missed / incomplete / unresolved / hard negative / exception` | `good / limited / unusable` | `reference / annotation / training / validation / calibration / locked acceptance` | `train / validation / calibration / locked acceptance / excluded` | `restricted-reference-ID` | `name/role` | `approved / pending / delete` | `sanitized notes only` |

## Required rules

- Use one stable non-sensitive reference ID per source video, session or collection block.
- Do not place file names containing client-sensitive information in GitHub.
- Do not include camera credentials, private IPs, exact sensitive site layouts or personal data.
- Record written permitted use before annotation, training or acceptance use.
- Split complete source videos/sessions/blocks; do not randomly split neighbouring frames across train and test.
- Freeze the locked acceptance material before final model tuning.
- Record duplicates, corruption, unusable coverage and missing scenarios.
- Bangladesh/reference material must remain separately identified and cannot be used as PTC acceptance evidence.

## Scenario coverage summary

| Scenario | Available references | Camera/views | Training coverage | Locked acceptance coverage | Additional capture required | PM decision |
|---|---|---|---|---|---|---|
| Completed/normal | `____` | `____` | `yes/no` | `yes/no` | `____` | `____` |
| Missed inspection | `____` | `____` | `yes/no` | `yes/no` | `____` | `____` |
| Incomplete inspection | `____` | `____` | `yes/no` | `yes/no` | `____` | `____` |
| Unresolved/insufficient visibility | `____` | `____` | `yes/no` | `yes/no` | `____` | `____` |
| Multiple workers/bales | `____` | `____` | `yes/no` | `yes/no` | `____` | `____` |
| Occlusion/rework/interruption | `____` | `____` | `yes/no` | `yes/no` | `____` | `____` |
| Lighting/glare/dust/vibration | `____` | `____` | `yes/no` | `yes/no` | `____` | `____` |
| Camera/model operational failure | `____` | `____` | `yes/no` | `yes/no` | `____` | `____` |

## Approval record

| Decision | Owner | Status | Date | Sanitized reference |
|---|---|---|---|---|
| Data-use permission | `____` | `approved/pending` | `____` | `____` |
| Access list | `____` | `approved/pending` | `____` | `____` |
| Retention/deletion | `____` | `approved/pending` | `____` | `____` |
| Train/validation/calibration/acceptance split | `____` | `approved/pending` | `____` | `____` |
| Additional safe capture plan | `____` | `approved/pending/not required` | `____` | `____` |
