  // Share the same-origin loader script and keep model scenes independent for animation.
  let modelLoader;
  function loadModel(asset, setup, warning) {
    const assets = window.MM_ASSETS;
    if (!assets || !assets[asset] || !assets.gltfLoader) return;
    if (!modelLoader) {
      modelLoader = new Promise((resolve, reject) => {
        const init = () => {
          if (!THREE.GLTFLoader) { reject(new Error('GLTFLoader did not initialize')); return; }
          // Load texture blob URLs through img-src, which allows them under the game's CSP.
          resolve(new THREE.GLTFLoader().register(parser => {
            parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
            return { name: 'mm_img_textures' };
          }));
        };
        if (THREE.GLTFLoader) { init(); return; }
        const script = document.createElement('script');
        script.src = assets.gltfLoader;
        script.onload = init;
        script.onerror = () => reject(new Error('Could not load GLTFLoader'));
        document.head.appendChild(script);
      });
    }
    modelLoader.then(loader => loader.loadAsync(assets[asset])).then(setup).catch(error => console.warn(warning, error));
  }
