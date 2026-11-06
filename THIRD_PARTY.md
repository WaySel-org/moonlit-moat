# Third-party software

## three.js r128

`vendor/three.min.js` is three.js release 128, © 2010-2021 three.js authors, used under the MIT License.
https://github.com/mrdoob/three.js/blob/r128/LICENSE

## three.js r128 GLTFLoader

`vendor/three-r128-GLTFLoader.js` is `examples/js/loaders/GLTFLoader.js` from the three.js r128 npm package
(three@0.128.0), © 2010-2021 three.js authors, MIT License (same licence as `vendor/three.min.js`). Unmodified.
It loads the hero model after the game starts and makes no requests of its own beyond the file it is given.

## Moonlit Her (hero model)

`assets/hero/moonlit-her.glb` is an original character designed for Moonlit Moat. Concept art: Google Gemini image
generation from WaySel's own prompts. Mesh: Hunyuan3D 2.1 (Tencent) image-to-3D. Texture: projected from the
concept art. Rig and animations: Adobe Mixamo auto-rigger and animation library, used under Adobe's Mixamo terms.
The build pipeline lives in WaySel's character-design workspace (`tools/build_glb.py`).

## IBM Plex Mono

`vendor/fonts/ibm-plex-mono-latin-{400,600}.woff2` are the Latin subsets of IBM Plex Mono 2.3 (the files Google Fonts serves), bundled so the game never calls an outside server. © IBM Corp., SIL Open Font License 1.1, full text in `vendor/fonts/OFL.txt`.
