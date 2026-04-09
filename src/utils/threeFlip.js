import * as THREE from 'three';
import { toCanvas } from 'html-to-image';

export async function captureTexture(domNode) {
  try {
    const canvas = await toCanvas(domNode, {
      pixelRatio: window.devicePixelRatio || 1,
      backgroundColor: '#ffffff',
      skipFonts: true,
      useCors: true,
      fetchRequestInit: {
        mode: 'cors',
        cache: 'no-cache',
      }
    });
    const texture = new THREE.CanvasTexture(canvas);
    // Use string literal to avoid undefined checks in older/edge three object definitions
    texture.colorSpace = 'srgb';
    return texture;
  } catch (err) {
    console.error("Texture capture failed!", err);
    throw err;
  }
}

export function setupThreeScene(container, frontTexture, backTexture, width, height) {
  // Give the WebGL viewport massive vertical space so the page doesn't clip when flipping UP
  const canvasHeight = height * 3; 
  const canvasWidth = width * 1.5;
  const cameraDistance = (canvasHeight / 2) / Math.tan((35 / 2) * Math.PI / 180);

  const camera = new THREE.PerspectiveCamera(35, canvasWidth / canvasHeight, 0.1, 3000);
  camera.position.set(0, 0, cameraDistance);

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    premultipliedAlpha: false
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvasWidth, canvasHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.position = 'absolute';
  // Shift canvas so its geometry center (y=0) perfectly overlays the DOM calendar (top=0)
  renderer.domElement.style.top = `${-height}px`;
  renderer.domElement.style.left = `${-(canvasWidth - width) / 2}px`;
  renderer.domElement.style.pointerEvents = 'none';
  renderer.domElement.style.zIndex = '100';
  renderer.domElement.style.overflow = 'visible';

  container.appendChild(renderer.domElement);

  const segmentsX = 1;
  const segmentsY = 80;
  
  const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
  const basePositions = new Float32Array(geometry.attributes.position.array);

  // Front face material - Use Standard Material for light reacting
  const frontMaterial = new THREE.MeshStandardMaterial({
    side: THREE.FrontSide,
    roughness: 0.9,
    metalness: 0.1,
  });
  if (frontTexture) frontMaterial.map = frontTexture;

  // Back face material
  const backMaterial = new THREE.MeshStandardMaterial({
    color: backTexture ? 0xffffff : new THREE.Color('#F2EDE6'),
    side: THREE.BackSide,
    roughness: 0.95,
    metalness: 0.0,
  });
  if (backTexture) backMaterial.map = backTexture;

  const frontMesh = new THREE.Mesh(geometry, frontMaterial);
  const backMesh = new THREE.Mesh(geometry, backMaterial);
  scene.add(frontMesh);
  scene.add(backMesh);

  // Lighting - Note: Scene is at PIXEL scale (e.g. height=600), so lights must be far away
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(0, height, cameraDistance);
  scene.add(directionalLight);

  const backLight = new THREE.DirectionalLight(0xfff5E6, 0.3);
  backLight.position.set(0, -height, -cameraDistance);
  scene.add(backLight);

  const shadowGeometry = new THREE.PlaneGeometry(width * 0.9, height * 0.1);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadowMesh.position.set(0, -height / 2, -5); // pushed back slightly
  scene.add(shadowMesh);

  return {
    render: (progress, direction) => {
      const positions = geometry.attributes.position;
      
      // forward: 0 -> PI (0 -> 180deg) 
      const rigidAngle = direction === 'forward' ? Math.PI * progress : Math.PI * (1 - progress);
      const bendIntensity = Math.sin(progress * Math.PI); // Peaks at 0.5 (90deg)
      
      for (let i = 0; i < positions.count; i++) {
        const baseX = basePositions[i*3];
        const baseY = basePositions[i*3 + 1];
        
        // 0 at binding (top=height/2), 1 at free end (bottom=-height/2)
        const normalizedFromBottom = (-baseY + height / 2) / height;
        const distanceFromBinding = normalizedFromBottom * height;
        
        let newX = baseX;
        let newZ = Math.sin(rigidAngle) * distanceFromBinding;
        let newY = (height / 2) - Math.cos(rigidAngle) * distanceFromBinding;
        
        // PHYSICAL PAPER FLEX PHYSICS:
        // 1. The top quarter of the page is almost rigid. Bottom half bears all the curl.
        // 2. The middle bulges OUT (towards viewer) and DROOPS (gravity).
        // 3. The bottom tip curls inward (lagging behind the pull).
        
        const midBulge = Math.sin(normalizedFromBottom * Math.PI); // 0 -> 1 -> 0
        const bottomHeavy = Math.pow(normalizedFromBottom, 2); // 0 -> 1 (steep curve)
        
        // Bulge: Middle of the page naturally bows outward and stretches down
        newZ += bendIntensity * midBulge * height * 0.18; // Bows out to viewer
        newY -= bendIntensity * midBulge * height * 0.12; // Droops via gravity
        
        // Curl: The free trailing edge (bottom) lags backward and curls in
        newZ -= bendIntensity * bottomHeavy * height * 0.10;
        newY += bendIntensity * bottomHeavy * height * 0.05;

        positions.setXYZ(i, newX, newY, newZ);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();

      shadowMaterial.opacity = bendIntensity * 0.25;
      renderer.render(scene, camera);
    },
    teardown: () => {
      geometry.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      if (frontTexture) frontTexture.dispose();
      if (backTexture) backTexture.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  };
}
