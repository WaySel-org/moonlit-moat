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

## Sword models (Sketchfab)

`assets/character/weapons/*.glb` are built by `tools/character/build_weapons.mjs`, which re-orients, re-scales and
shrinks the downloads (textures to 512 or 1024 px JPEG). The in-game names are ours; the models are the authors' work.

- `moatwatch.glb` (Moatwatch Longsword): "Sword" by minghauLoh (https://sketchfab.com/minghau), CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/), https://sketchfab.com/3d-models/sword-07463a2658e04d6ab8a42b5639a35d63.
- `nightneedle.glb` (Night Needle): "sword" by sketh (https://sketchfab.com/sketh), CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/), https://sketchfab.com/3d-models/sword-618f2b9300d647dcbd4920b0a76458aa.
- `hollowfang.glb` (Hollowfang): "Demon Sword" by kyrylyushkov (https://sketchfab.com/kyrylyushkov), CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/), https://sketchfab.com/3d-models/demon-sword-9b385527820545a39bacf4410297767c.
- `wyrmbane.glb` (Wyrmbane, the Monster-Breaker): "Zweihänder sword" by Lisov1k (https://sketchfab.com/Lisov1k), CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/), https://sketchfab.com/3d-models/zweihander-sword-a5dbfd4e49c44e1e8fac6652e064042b.
- `tidecutter.glb` (Tidecutter): "Pirate sword" by Urpo (https://sketchfab.com/Urpo), CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/), https://sketchfab.com/3d-models/pirate-sword-280e72a198384f868e43df624d9b6d51. **Non-commercial only:** this model may not be used commercially, unlike the rest of this repository (MIT).

## IBM Plex Mono

`vendor/fonts/ibm-plex-mono-latin-{400,600}.woff2` are the Latin subsets of IBM Plex Mono 2.3 (the files Google Fonts serves), bundled so the game never calls an outside server. © IBM Corp., SIL Open Font License 1.1, full text in `vendor/fonts/OFL.txt`.
