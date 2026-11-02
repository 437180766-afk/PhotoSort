# Offline OCR assets

PhotoSort loads OCR only from this directory. It does not call a remote OCR service.

Add the PaddleOCR Chinese lightweight detection and recognition model files, vocabulary
file, WebAssembly runtime, and a local `paddleocr.js` adapter here. The adapter must
expose this interface:

```js
window.PhotoSortPaddleOCR.create({
  detModel: detModelPath,
  recModel: recModelPath,
  keys: vocabularyPath,
  wasm: wasmDirectory
}).then(engine => engine.recognize(localImagePath))
```

`recognize` may return a string or an array of `{ text: string }` results. Keep model
and runtime files out of source control; distribute them with the app locally. Without
the adapter and model assets, photo browsing and non-OCR rules remain available, but
text-based categories cannot be recognized.
