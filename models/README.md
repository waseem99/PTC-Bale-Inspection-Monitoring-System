# Local YOLO weights

Put trained `.pt` / `.onnx` / `.engine` files here. They are gitignored.

Name them so tracking and inspection can be distinguished:

```text
models/ptc-bale-track.pt
models/ptc-bale-inspect.pt
```

Each recorded-video frame runs **tracking first**, then **inspection detection**.
