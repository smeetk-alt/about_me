/* =============================================
   RC Portfolio — Game Engine
   Three.js Scene, Matter.js Physics, Car, Input
   ============================================= */

// ── GLOBALS ──
let renderer, scene, camera, clock;
let engine, matterWorld;
let carBody, carMesh, wheelMeshes = [];
let wheelPivots = [];
let keys = { w: false, a: false, s: false, d: false };
let gameStarted = false, panelOpen = false;
let currentStage = 0;
let triggeredCheckpoints = new Set();
let skidPoints = [], dustParticles = [];
let frontWheelSteer = 0;

// ── TRACK CONFIG ──
const ROAD_Y = 0.05;
const ROAD_W = 14;
const STAGES = [
  { id: 0, name: 'About Me', x: 0, z: 0, panel: 'panel-about' },
  { id: 1, name: 'Skills', x: 80, z: 0, panel: 'panel-skills' },
  { id: 2, name: 'Projects', x: 160, z: 0, panel: 'panel-projects' },
  { id: 3, name: 'Contact', x: 240, z: 0, panel: 'panel-contact' },
];
const CHECKPOINTS = [
  { id: 'cp0', stage: 0, x: 5, z: 0, r: 10 },
  { id: 'cp1', stage: 1, x: 80, z: 0, r: 12 },
  { id: 'cp2', stage: 2, x: 160, z: 0, r: 14 },
  { id: 'cp3', stage: 3, x: 240, z: 0, r: 10 },
];

// ── OBSTACLES (for Matter.js static bodies + Three.js visuals) ──
const OBSTACLES = [
  // Skill blocks
  { id: 'excel', x: 65, z: -5, w: 4, h: 4, color: 0x10b981, label: 'Excel', type: 'block' },
  { id: 'sheets', x: 72, z: 5, w: 4, h: 4, color: 0x22c55e, label: 'Sheets', type: 'block' },
  { id: 'git', x: 88, z: -4, w: 3, h: 3, color: 0xf97316, label: 'Git', type: 'block' },
  { id: 'data', x: 95, z: 5, w: 4, h: 3, color: 0x3b82f6, label: 'Data', type: 'block' },
  { id: 'ai', x: 75, z: -2, w: 3, h: 3, color: 0xa855f7, label: 'AI', type: 'block' },
  // Cones
  { id: 'c1', x: 20, z: -6.5, w: 1.2, h: 1.2, color: 0xf97316, type: 'cone' },
  { id: 'c2', x: 20, z: 6.5, w: 1.2, h: 1.2, color: 0xf97316, type: 'cone' },
  { id: 'c3', x: 40, z: -6.5, w: 1.2, h: 1.2, color: 0xf97316, type: 'cone' },
  { id: 'c4', x: 40, z: 6.5, w: 1.2, h: 1.2, color: 0xf97316, type: 'cone' },
  { id: 'c5', x: 120, z: -6.5, w: 1.2, h: 1.2, color: 0xf97316, type: 'cone' },
  { id: 'c6', x: 120, z: 6.5, w: 1.2, h: 1.2, color: 0xf97316, type: 'cone' },
  // Barriers
  { id: 'b1', x: 110, z: -8, w: 10, h: 1.2, color: 0x4b5563, type: 'barrier' },
  { id: 'b2', x: 110, z: 8, w: 10, h: 1.2, color: 0x4b5563, type: 'barrier' },
  { id: 'b3', x: 200, z: -8, w: 10, h: 1.2, color: 0x4b5563, type: 'barrier' },
  { id: 'b4', x: 200, z: 8, w: 10, h: 1.2, color: 0x4b5563, type: 'barrier' },
  // Bugs
  { id: 'bug1', x: 130, z: -3, w: 2, h: 2, color: 0xef4444, label: '🐛', type: 'cone' },
  { id: 'bug2', x: 185, z: 3, w: 2, h: 2, color: 0xef4444, label: '🐛', type: 'cone' },
];

// ══════════════════════════════
// INIT
// ══════════════════════════════
function init() {
  initThree();
  initPhysics();
  buildWorld();
  buildCar();
  initInput();
  initUI();
  clock = new THREE.Clock();
  animate();
}

// ══════════════════════════════
// THREE.JS SCENE
// ══════════════════════════════
function initThree() {
  const container = document.getElementById('canvas-container');

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070714);
  scene.fog = new THREE.FogExp2(0x070714, 0.006);

  // Camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(-15, 12, 0);
  camera.lookAt(0, 0, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0x1a1a3e, 0.6);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x2a2a5e, 0x0a0a1e, 0.4);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(30, 50, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -100;
  dirLight.shadow.camera.right = 300;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 200;
  scene.add(dirLight);

  // Neon point lights at checkpoints
  STAGES.forEach(s => {
    const pl = new THREE.PointLight(0x00d4ff, 1.5, 30);
    pl.position.set(s.x, 4, s.z);
    scene.add(pl);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ══════════════════════════════
// MATTER.JS PHYSICS
// ══════════════════════════════
function initPhysics() {
  engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
  matterWorld = engine.world;

  // Car body (rectangle)
  carBody = Matter.Bodies.rectangle(0, 0, 3.5, 2, {
    frictionAir: 0.04,
    friction: 0.08,
    restitution: 0.3,
    density: 0.002,
    label: 'car',
  });
  Matter.World.add(matterWorld, carBody);

  // Road boundaries (very long walls along track edges)
  const wallOpts = { isStatic: true, restitution: 0.4, label: 'wall' };
  const wallTop = Matter.Bodies.rectangle(120, -(ROAD_W / 2 + 1), 520, 2, wallOpts);
  const wallBot = Matter.Bodies.rectangle(120, (ROAD_W / 2 + 1), 520, 2, wallOpts);
  // Back wall
  const wallBack = Matter.Bodies.rectangle(-10, 0, 2, ROAD_W + 4, wallOpts);
  // Front wall (after finish)
  const wallFront = Matter.Bodies.rectangle(260, 0, 2, ROAD_W + 4, wallOpts);
  Matter.World.add(matterWorld, [wallTop, wallBot, wallBack, wallFront]);

  // Obstacle bodies
  OBSTACLES.forEach(o => {
    const body = Matter.Bodies.rectangle(o.x, o.z, o.w, o.h, {
      isStatic: true, restitution: 0.5, label: 'obstacle_' + o.id,
    });
    Matter.World.add(matterWorld, body);
    o.body = body;
  });

  // Collision events
  Matter.Events.on(engine, 'collisionStart', (e) => {
    e.pairs.forEach(pair => {
      const labels = [pair.bodyA.label, pair.bodyB.label];
      if (labels.includes('car')) {
        const speed = Matter.Vector.magnitude(carBody.velocity);
        if (speed > 2) {
          // Velocity reduction on impact
          Matter.Body.setVelocity(carBody, {
            x: carBody.velocity.x * 0.4,
            y: carBody.velocity.y * 0.4,
          });
        }
      }
    });
  });
}

// ══════════════════════════════
// BUILD WORLD
// ══════════════════════════════
function buildWorld() {
  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(600, 200);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a18, roughness: 0.95, metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(120, -0.01, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid helper
  const grid = new THREE.GridHelper(600, 120, 0x111130, 0x0d0d25);
  grid.position.set(120, 0.01, 0);
  scene.add(grid);

  // Road (main strip)
  const roadGeo = new THREE.PlaneGeometry(280, ROAD_W);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a30, roughness: 0.7, metalness: 0.1,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(125, ROAD_Y, 0);
  road.receiveShadow = true;
  scene.add(road);

  // Center dashed line
  for (let x = -10; x < 260; x += 6) {
    const dashGeo = new THREE.PlaneGeometry(3, 0.2);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xffdd57, emissive: 0xffdd57, emissiveIntensity: 0.3 });
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, ROAD_Y + 0.01, 0);
    scene.add(dash);
  }

  // Road edge lines
  [-ROAD_W / 2 + 0.3, ROAD_W / 2 - 0.3].forEach(z => {
    const edgeGeo = new THREE.PlaneGeometry(280, 0.15);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x444470 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(125, ROAD_Y + 0.01, z);
    scene.add(edge);
  });

  // Checkpoint rings (glowing torus on the road)
  CHECKPOINTS.forEach(cp => {
    const torusGeo = new THREE.TorusGeometry(cp.r * 0.6, 0.15, 8, 32);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.5,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = -Math.PI / 2;
    torus.position.set(cp.x, 0.3, cp.z);
    scene.add(torus);
    cp.mesh = torus;
  });

  // Stage markers (pillars with glow)
  STAGES.forEach((s, i) => {
    // Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.6,
    });
    const pillarL = new THREE.Mesh(pillarGeo, pillarMat);
    pillarL.position.set(s.x, 3, -ROAD_W / 2 - 2);
    pillarL.castShadow = true;
    scene.add(pillarL);

    const pillarR = pillarL.clone();
    pillarR.position.set(s.x, 3, ROAD_W / 2 + 2);
    scene.add(pillarR);

    // Arch between pillars
    if (i === 0 || i === 3) {
      const archGeo = new THREE.BoxGeometry(0.3, 0.3, ROAD_W + 4);
      const arch = new THREE.Mesh(archGeo, pillarMat.clone());
      arch.position.set(s.x, 6, 0);
      scene.add(arch);
    }
  });

  // Build 3D obstacles
  OBSTACLES.forEach(o => {
    let mesh;
    if (o.type === 'cone') {
      const coneGeo = new THREE.ConeGeometry(o.w * 0.5, o.w * 1.5, 8);
      const coneMat = new THREE.MeshStandardMaterial({
        color: o.color, emissive: o.color, emissiveIntensity: 0.2,
      });
      mesh = new THREE.Mesh(coneGeo, coneMat);
      mesh.position.set(o.x, o.w * 0.75, o.z);
    } else if (o.type === 'barrier') {
      const barGeo = new THREE.BoxGeometry(o.w, 1.5, o.h);
      const barMat = new THREE.MeshStandardMaterial({
        color: o.color, roughness: 0.8,
      });
      mesh = new THREE.Mesh(barGeo, barMat);
      mesh.position.set(o.x, 0.75, o.z);
    } else {
      // Block
      const blockGeo = new THREE.BoxGeometry(o.w, o.w * 0.8, o.h);
      const blockMat = new THREE.MeshStandardMaterial({
        color: o.color, emissive: o.color, emissiveIntensity: 0.15,
        roughness: 0.4, metalness: 0.3,
      });
      mesh = new THREE.Mesh(blockGeo, blockMat);
      mesh.position.set(o.x, o.w * 0.4, o.z);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    o.mesh = mesh;
  });

  // Finish line pattern
  for (let i = 0; i < 14; i++) {
    for (let j = 0; j < 2; j++) {
      const sqGeo = new THREE.PlaneGeometry(1, 1);
      const isWhite = (i + j) % 2 === 0;
      const sqMat = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xffffff : 0x111111,
        emissive: isWhite ? 0xffffff : 0x000000,
        emissiveIntensity: isWhite ? 0.15 : 0,
      });
      const sq = new THREE.Mesh(sqGeo, sqMat);
      sq.rotation.x = -Math.PI / 2;
      sq.position.set(239 + j, ROAD_Y + 0.02, -ROAD_W / 2 + 0.5 + i);
      scene.add(sq);
    }
  }
}

// ══════════════════════════════
// BUILD CAR
// ══════════════════════════════
function buildCar() {
  carMesh = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(3.5, 0.8, 2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.15,
    roughness: 0.2, metalness: 0.7,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  body.castShadow = true;
  carMesh.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.8, 0.6, 1.6);
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a30, roughness: 0.1, metalness: 0.9,
    transparent: true, opacity: 0.7,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(-0.2, 1.1, 0);
  carMesh.add(cabin);

  // Headlights
  [-0.65, 0.65].forEach(z => {
    const hlGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1,
    });
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(1.75, 0.6, z);
    carMesh.add(hl);
  });

  // Tail lights
  [-0.65, 0.65].forEach(z => {
    const tlGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.8,
    });
    const tl = new THREE.Mesh(tlGeo, tlMat);
    tl.position.set(-1.75, 0.6, z);
    carMesh.add(tl);
  });

  // Undercar glow
  const glowGeo = new THREE.PlaneGeometry(4, 2.5);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.08;
  carMesh.add(glow);

  // Wheels with Pivots
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const wheelPositions = [
    [1.1, 0.35, 1.1],   // Front Left
    [1.1, 0.35, -1.1],  // Front Right
    [-1.1, 0.35, 1.1],  // Rear Left
    [-1.1, 0.35, -1.1], // Rear Right
  ];

  wheelPivots = [];
  wheelMeshes = [];

  wheelPositions.forEach(([x, y, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);

    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.castShadow = true;
    pivot.add(wheel);

    carMesh.add(pivot);
    wheelPivots.push(pivot);
    wheelMeshes.push(wheel);
  });

  carMesh.position.set(0, 0, 0);
  scene.add(carMesh);
}

// ══════════════════════════════
// INPUT HANDLING
// ══════════════════════════════
function initInput() {
  const keyMap = {
    'KeyW': 'w', 'ArrowUp': 'w',
    'KeyS': 's', 'ArrowDown': 's',
    'KeyA': 'a', 'ArrowLeft': 'a',
    'KeyD': 'd', 'ArrowRight': 'd',
  };
  document.addEventListener('keydown', (e) => {
    if (panelOpen && e.code === 'Escape') { closePanel(); return; }
    const k = keyMap[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', (e) => {
    const k = keyMap[e.code];
    if (k) { keys[k] = false; e.preventDefault(); }
  });
}

// ══════════════════════════════
// UI & PANELS
// ══════════════════════════════
function initUI() {
  const btnStart = document.getElementById('btn-start');
  const startScreen = document.getElementById('start-screen');
  const hud = document.getElementById('hud');

  btnStart.addEventListener('click', () => {
    // Hide start screen with GSAP
    gsap.to(startScreen, {
      opacity: 0,
      duration: 0.8,
      onComplete: () => {
        startScreen.classList.remove('active');
        hud.classList.remove('hidden');
        gameStarted = true;
        clock.getDelta(); // reset clock
      }
    });
  });

  // Clicking HUD stage dots opens panels
  document.querySelectorAll('.stage-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const stageIdx = parseInt(dot.getAttribute('data-stage'));
      openPanel(stageIdx);
    });
  });
}

function openPanel(stageIdx) {
  closePanel();

  const stage = STAGES[stageIdx];
  const panel = document.getElementById(stage.panel);
  if (panel) {
    panel.classList.remove('hidden');
    setTimeout(() => {
      panel.classList.add('visible');
    }, 50);
    panelOpen = true;

    // Reset controls & halt car speed
    Matter.Body.setVelocity(carBody, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(carBody, 0);
    keys = { w: false, a: false, s: false, d: false };
  }
}

function closePanel() {
  const panels = document.querySelectorAll('.panel');
  panels.forEach(p => {
    p.classList.remove('visible');
    setTimeout(() => {
      p.classList.add('hidden');
    }, 300);
  });
  panelOpen = false;
  window.focus();
}

function handleContactSubmit(event) {
  event.preventDefault();

  const btn = event.target.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.textContent = 'Sending...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Message Sent! 🏁';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    btn.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.4)';

    setTimeout(() => {
      btn.textContent = origText;
      btn.disabled = false;
      btn.style.background = '';
      btn.style.boxShadow = '';
      event.target.reset();
      closePanel();
    }, 2000);
  }, 1200);
}

// Bind to window to allow HTML onClick handlers
window.closePanel = closePanel;
window.openPanel = openPanel;
window.handleContactSubmit = handleContactSubmit;

function showCheckpointToast(stageIdx) {
  const toast = document.getElementById('checkpoint-toast');
  const toastName = document.getElementById('toast-name');

  const stage = STAGES[stageIdx];
  toastName.textContent = stage.name;

  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('visible');
  }, 50);

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 500);
  }, 3000);
}

function updateHUDStages() {
  const dots = document.querySelectorAll('.stage-dot');
  const lines = document.querySelectorAll('.stage-line');

  dots.forEach((dot, idx) => {
    dot.classList.remove('active', 'completed');
    if (idx === currentStage) {
      dot.classList.add('active');
    } else if (idx < currentStage) {
      dot.classList.add('completed');
    }
  });

  lines.forEach((line, idx) => {
    line.classList.remove('completed');
    if (idx < currentStage) {
      line.classList.add('completed');
    }
  });
}

// ══════════════════════════════
// SKIDMARKS & DUST
// ══════════════════════════════
const skidGeo = new THREE.PlaneGeometry(0.3, 0.6);
const skidMat = new THREE.MeshBasicMaterial({
  color: 0x050510,
  transparent: true,
  opacity: 0.35,
  depthWrite: false
});

function spawnSkidmarks() {
  // Use rear wheel pivots (indices 2 and 3)
  [2, 3].forEach(idx => {
    if (!wheelPivots[idx]) return;
    const worldPos = new THREE.Vector3();
    wheelPivots[idx].getWorldPosition(worldPos);

    const skid = new THREE.Mesh(skidGeo, skidMat.clone());
    skid.rotation.x = -Math.PI / 2;
    skid.rotation.z = carMesh.rotation.y;
    skid.position.set(worldPos.x, ROAD_Y + 0.005, worldPos.z);
    scene.add(skid);

    skidPoints.push({
      mesh: skid,
      life: 240
    });
  });
}

const particleGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

function spawnDust(isDrifting) {
  [2, 3].forEach(idx => {
    if (!wheelPivots[idx]) return;
    const worldPos = new THREE.Vector3();
    wheelPivots[idx].getWorldPosition(worldPos);

    const pMat = new THREE.MeshBasicMaterial({
      color: 0x3a3a5a,
      transparent: true,
      opacity: 0.5
    });
    const p = new THREE.Mesh(particleGeo, pMat);
    p.position.set(worldPos.x, ROAD_Y + 0.1, worldPos.z);

    const angle = carBody.angle;
    const vx = (Math.random() - 0.5) * 0.08 - Math.cos(angle) * (isDrifting ? 0.05 : 0.02);
    const vy = Math.random() * 0.05 + 0.03;
    const vz = (Math.random() - 0.5) * 0.08 - Math.sin(angle) * (isDrifting ? 0.05 : 0.02);

    scene.add(p);
    dustParticles.push({
      mesh: p,
      vel: { x: vx, y: vy, z: vz },
      life: 30,
      maxLife: 30
    });
  });
}

// ══════════════════════════════
// PHYSICS UPDATE & LOOP
// ══════════════════════════════
function updateCarPhysics() {
  const currentSpeed = Matter.Vector.magnitude(carBody.velocity);

  // Driving force
  let forceMagnitude = 0.00045;

  // Steering
  let steerSpeed = 0.04;
  let speedSteerFactor = Math.min(currentSpeed / 2.0, 1.0);

  if (keys.a) {
    Matter.Body.setAngle(carBody, carBody.angle - steerSpeed * speedSteerFactor);
  }
  if (keys.d) {
    Matter.Body.setAngle(carBody, carBody.angle + steerSpeed * speedSteerFactor);
  }

  if (keys.w) {
    let forceX = Math.cos(carBody.angle) * forceMagnitude;
    let forceY = Math.sin(carBody.angle) * forceMagnitude;
    Matter.Body.applyForce(carBody, carBody.position, { x: forceX, y: forceY });
  } else if (keys.s) {
    let forceX = -Math.cos(carBody.angle) * forceMagnitude * 0.6;
    let forceY = -Math.sin(carBody.angle) * forceMagnitude * 0.6;
    Matter.Body.applyForce(carBody, carBody.position, { x: forceX, y: forceY });
  }

  // De-drift and lateral friction
  let headingX = Math.cos(carBody.angle);
  let headingY = Math.sin(carBody.angle);

  let perpX = -Math.sin(carBody.angle);
  let perpY = Math.cos(carBody.angle);

  let velX = carBody.velocity.x;
  let velY = carBody.velocity.y;

  let forwardSpeed = velX * headingX + velY * headingY;
  let lateralSpeed = velX * perpX + velY * perpY;

  let isDrifting = false;
  if ((keys.a || keys.d) && currentSpeed > 4.5 && Math.abs(lateralSpeed) > 1.2) {
    isDrifting = true;
  }

  let newLateralSpeed = lateralSpeed * (isDrifting ? 0.88 : 0.05);

  Matter.Body.setVelocity(carBody, {
    x: headingX * forwardSpeed + perpX * newLateralSpeed,
    y: headingY * forwardSpeed + perpY * newLateralSpeed
  });

  const maxSpeed = 7.5;
  const speed = Matter.Vector.magnitude(carBody.velocity);
  if (speed > maxSpeed) {
    let heading = Matter.Vector.normalise(carBody.velocity);
    Matter.Body.setVelocity(carBody, {
      x: heading.x * maxSpeed,
      y: heading.y * maxSpeed
    });
  }

  // Visual wheels spin
  let spin = forwardSpeed * 0.15;
  wheelMeshes.forEach(w => {
    w.rotation.y += spin;
  });

  // Front wheels visual steer
  let targetWheelSteer = 0;
  if (keys.a) targetWheelSteer = -0.45;
  else if (keys.d) targetWheelSteer = 0.45;
  frontWheelSteer = THREE.MathUtils.lerp(frontWheelSteer, targetWheelSteer, 0.15);

  if (wheelPivots[0]) wheelPivots[0].rotation.y = frontWheelSteer;
  if (wheelPivots[1]) wheelPivots[1].rotation.y = frontWheelSteer;

  // Speedometer HUD
  const speedVal = document.getElementById('speed-value');
  const speedFill = document.getElementById('speed-fill');
  const driftInd = document.getElementById('drift-indicator');

  if (speedVal) speedVal.textContent = Math.round(speed * 15);
  if (speedFill) speedFill.style.width = Math.min((speed / maxSpeed) * 100, 100) + '%';
  if (driftInd) {
    if (isDrifting) driftInd.classList.remove('hidden');
    else driftInd.classList.add('hidden');
  }

  if (isDrifting && Math.random() < 0.6) {
    spawnSkidmarks();
  }

  if ((isDrifting || (keys.w && speed < 2)) && Math.random() < 0.4) {
    spawnDust(isDrifting);
  }
}

function checkCheckpoints() {
  let closestStageIdx = 0;
  let minStageDist = Infinity;

  STAGES.forEach((s, idx) => {
    let dx = carBody.position.x - s.x;
    let dz = carBody.position.y - s.z;
    let dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minStageDist) {
      minStageDist = dist;
      closestStageIdx = idx;
    }
  });

  if (closestStageIdx !== currentStage) {
    currentStage = closestStageIdx;
    updateHUDStages();
  }

  CHECKPOINTS.forEach(cp => {
    let dx = carBody.position.x - cp.x;
    let dz = carBody.position.y - cp.z;
    let dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < cp.r) {
      if (cp.mesh) {
        cp.mesh.material.emissiveIntensity = 1.6;
        cp.mesh.material.opacity = 0.8;
      }

      if (!triggeredCheckpoints.has(cp.id)) {
        triggeredCheckpoints.add(cp.id);
        showCheckpointToast(cp.stage);

        setTimeout(() => {
          openPanel(cp.stage);
        }, 800);
      }
    } else {
      if (cp.mesh) {
        cp.mesh.material.emissiveIntensity = 0.6;
        cp.mesh.material.opacity = 0.5;
      }
    }
  });
}

function updateParticles() {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    p.life--;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      dustParticles.splice(i, 1);
    } else {
      p.mesh.position.x += p.vel.x;
      p.mesh.position.y += p.vel.y;
      p.mesh.position.z += p.vel.z;
      p.mesh.scale.multiplyScalar(1.05);
      p.mesh.material.opacity = (p.life / p.maxLife) * 0.5;
    }
  }
}

function updateSkidmarks() {
  for (let i = skidPoints.length - 1; i >= 0; i--) {
    const s = skidPoints[i];
    s.life--;
    if (s.life <= 0) {
      scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
      skidPoints.splice(i, 1);
    } else if (s.life < 40) {
      s.mesh.material.opacity = (s.life / 40) * 0.35;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  let delta = clock.getDelta();
  if (delta > 0.1) delta = 0.1;

  if (gameStarted && !panelOpen) {
    Matter.Engine.update(engine, 1000 / 60);
    updateCarPhysics();
    checkCheckpoints();
  }

  updateParticles();
  updateSkidmarks();

  if (carMesh && carBody) {
    carMesh.position.set(carBody.position.x, 0.4, carBody.position.y);
    carMesh.rotation.y = -carBody.angle;
  }

  if (camera && carBody) {
    let targetCamX = carBody.position.x - 16;
    let targetCamY = 10;
    let targetCamZ = carBody.position.y * 0.4;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.06);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.06);

    let lookTarget = new THREE.Vector3(carBody.position.x + 4, 0.5, carBody.position.y);
    camera.lookAt(lookTarget);
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

window.addEventListener('DOMContentLoaded', init);
