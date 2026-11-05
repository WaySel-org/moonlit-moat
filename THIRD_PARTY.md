# Third-party software

## three.js r128

`vendor/three.min.js` is three.js release 128, © 2010-2021 three.js authors, used under the MIT License.
https://github.com/mrdoob/three.js/blob/r128/LICENSE

## three.js r128 GLTFLoader

`vendor/three-r128-GLTFLoader.js` is `examples/js/loaders/GLTFLoader.js` from the three.js r128 npm package
(three@0.128.0), © 2010-2021 three.js authors, MIT License (same licence as `vendor/three.min.js`). Unmodified.
It loads the character kit after the game starts and makes no requests beyond the files it is given.

## Character kit (Quaternius, CC0)

`assets/character/` is built by `tools/character/build_kit.mjs` from four packs by Quaternius, all released under
CC0 1.0 (public domain, no attribution required; credited here anyway): Universal Base Characters, Modular Character
Outfits - Fantasy, Universal Animation Library and Universal Animation Library 2 ("Standard" downloads from
https://quaternius.itch.io). The pipeline cuts the bodies into regions, makes skin and hair textures tintable,
hue-shifts the eye texture into seven colours and trims the animation set. Every name, gear piece and design built
on top of them (beard styles, forged armour, shields, weapons, cloaks) is original to Moonlit Moat.

## IBM Plex Mono

`vendor/fonts/ibm-plex-mono-latin-{400,600}.woff2` are the Latin subsets of IBM Plex Mono 2.3 (the files Google Fonts serves), bundled so the game never calls an outside server. © IBM Corp., SIL Open Font License 1.1, full text in `vendor/fonts/OFL.txt`.
