# Edge Agent

Planned Python service boundary for camera connectivity and local operational reliability.

## Responsibilities

- RTSP/ONVIF camera configuration and reconnect;
- camera/service health;
- frame and rolling-video buffering;
- snapshot and short-clip evidence generation;
- durable local event spool;
- delivery to the local platform API;
- optional approved Azure synchronization;
- Windows service and watchdog integration.

## Exclusions

- no dashboard business workflows;
- no permanent bale identity;
- no scanner, RFID, PLC or custom IoT integration without approved change control.

Implementation is tracked under issues #20–#26.
