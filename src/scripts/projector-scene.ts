/**
 * The low-poly PS2-style projection room.
 *
 * Look: rendered at 400x225 and upscaled with `image-rendering: pixelated`,
 * vertices snapped to a coarse screen grid (the PS1/PS2 "wobble"), tiny
 * nearest-filtered canvas textures, flat-shaded faceted walls, fog.
 *
 * The 3D scene only draws the room. Project content is real HTML that the page
 * pins over the 3D screen using `onScreenRect`, so text stays sharp and accessible.
 */
import * as THREE from 'three';

export interface SlideDef {
  id: string;
  n: string;
  label: string;
  light: string; // pastel hex
}

export interface SceneOptions {
  slides: SlideDef[];
  onLoad: (id: string) => void; // user dropped or clicked a slide
  onHover: (id: string | null) => void;
  onDragState: (dragging: boolean, overProjector: boolean) => void;
  onScreenRect: (rect: { x: number; y: number; w: number; h: number }, glow: number) => void;
}

export interface ProjectorScene {
  setCurrent: (id: string | null) => void;
  dispose: () => void;
}

const RENDER_W = 400;
const RENDER_H = 225;
const SNAP = new THREE.Vector2(200, 112); // vertex snapping grid

export function createProjectorScene(canvas: HTMLCanvasElement, opts: SceneOptions): ProjectorScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  } catch {
    return null; // no WebGL: the page still works from the slide buttons
  }
  renderer.setPixelRatio(1);
  renderer.setSize(RENDER_W, RENDER_H, false);
  renderer.setClearColor(0x120b06, 1);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x120b06, 9, 17);
  const camera = new THREE.PerspectiveCamera(44, RENDER_W / RENDER_H, 0.1, 60);
  camera.position.set(0, 3.4, 7.0);
  camera.lookAt(0, 1.75, -1.6);

  let seed = 3;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const psx = <M extends THREE.Material>(mat: M): M => {
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
  vec2 psxRes = vec2(${SNAP.x.toFixed(1)}, ${SNAP.y.toFixed(1)});
  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * psxRes + 0.5) / psxRes * gl_Position.w;`,
      );
    };
    return mat;
  };
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d')!, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  };
  const lam = (o: THREE.MeshLambertMaterialParameters) => psx(new THREE.MeshLambertMaterial(o));
  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material | THREE.Material[],
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // Lights. three.js uses physical light units; the PI factors keep the old-console brightness.
  scene.add(new THREE.HemisphereLight(0x9a7550, 0x1a100a, 0.75 * Math.PI));
  const key = new THREE.DirectionalLight(0xffe6c4, 0.55 * Math.PI);
  key.position.set(-4, 7, 5);
  scene.add(key);

  // Faceted room
  const facetPlane = (w: number, h: number, sx: number, sy: number, amp: number, color: number) => {
    const g = new THREE.PlaneGeometry(w, h, sx, sy);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, (rnd() - 0.5) * amp);
    g.computeVertexNormals();
    return new THREE.Mesh(g, lam({ color, flatShading: true }));
  };
  const wall = facetPlane(22, 11, 11, 6, 0.35, 0x3a2a1e);
  wall.position.set(0, 3.5, -5.2);
  scene.add(wall);
  const floor = facetPlane(22, 14, 8, 6, 0.25, 0x24180f);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.6, 0);
  scene.add(floor);
  const lwall = facetPlane(14, 11, 6, 6, 0.3, 0x2e2118);
  lwall.rotation.y = Math.PI / 2;
  lwall.position.set(-8, 3.5, 0);
  scene.add(lwall);
  const rwall = facetPlane(14, 11, 6, 6, 0.3, 0x2e2118);
  rwall.rotation.y = -Math.PI / 2;
  rwall.position.set(8, 3.5, 0);
  scene.add(rwall);

  // Screen
  const SCX = -0.1, SCY = 3.45, SCZ = -4.8, SW = 7.4, SH = 4.16;
  add(new THREE.BoxGeometry(SW + 0.3, SH + 0.3, 0.12), lam({ color: 0x1c1712 }), SCX, SCY, SCZ - 0.08);
  const screenMat = psx(new THREE.MeshBasicMaterial({ color: 0x4a443b }));
  add(new THREE.PlaneGeometry(SW, SH), screenMat, SCX, SCY, SCZ);
  add(new THREE.CylinderGeometry(0.09, 0.09, SW + 0.6, 6), lam({ color: 0x2a231d }), SCX, SCY + SH / 2 + 0.2, SCZ).rotation.z =
    Math.PI / 2;
  const screenLight = new THREE.PointLight(0xffffff, 0, 9, 0);
  screenLight.position.set(SCX, SCY, SCZ + 1.2);
  scene.add(screenLight);

  // Desk
  const woodTex = tex(32, 16, (g, w, h) => {
    g.fillStyle = '#6b4325';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = y % 4 ? '#5c381e' : '#74492a';
      g.fillRect(0, y, w, 1);
    }
    g.fillStyle = '#4a2c16';
    g.fillRect(10, 5, 5, 1);
    g.fillRect(22, 11, 4, 1);
  });
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(4, 2);
  const deskSide = lam({ color: 0x4a2c16 });
  add(
    new THREE.BoxGeometry(9, 0.3, 3.8),
    [deskSide, deskSide, lam({ map: woodTex }), lam({ color: 0x2a1a0e }), lam({ color: 0x55331b }), deskSide],
    0,
    -0.15,
    1.0,
  );

  // Projector
  const sideTex = tex(64, 32, (g, w, h) => {
    g.fillStyle = '#c9bca4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b3a58b';
    g.fillRect(0, h - 5, w, 5);
    g.fillStyle = '#4a3f33';
    for (let i = 0; i < 7; i++) g.fillRect(6 + i * 4, 8, 2, 12);
    g.fillStyle = '#7a6a55';
    g.fillRect(40, 10, 18, 7);
    g.fillStyle = '#e8a64a';
    g.fillRect(42, 12, 2, 3);
    g.fillRect(46, 12, 2, 3);
    g.fillRect(50, 12, 6, 3);
  });
  const frontTex = tex(32, 16, (g, w, h) => {
    g.fillStyle = '#bfb197';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#a99a7f';
    g.fillRect(0, h - 3, w, 3);
  });
  const PX = 1.9, PZ = 1.05;
  const aim = new THREE.Group();
  aim.position.set(PX, 0, PZ);
  aim.rotation.y = Math.atan2(SCX - PX, SCZ - PZ);
  scene.add(aim);
  const rig = new THREE.Group();
  rig.scale.setScalar(0.62);
  aim.add(rig);
  add(
    new THREE.BoxGeometry(2.4, 1.0, 1.7),
    [lam({ map: sideTex }), lam({ map: sideTex }), lam({ color: 0x3a3128 }), lam({ color: 0x8f8170 }), lam({ map: frontTex }), lam({ map: frontTex })],
    0,
    0.62,
    0,
    rig,
  );
  add(new THREE.BoxGeometry(2.1, 0.12, 1.4), lam({ color: 0x2e2620 }), 0, 1.18, 0, rig);
  const slot = add(new THREE.BoxGeometry(0.14, 0.06, 1.0), new THREE.MeshBasicMaterial({ color: 0x0b0806 }), -0.45, 1.25, 0, rig);
  add(new THREE.CylinderGeometry(0.34, 0.4, 0.75, 8), lam({ color: 0x2a231d }), 0.2, 0.62, 1.2, rig).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.44, 0.44, 0.14, 8), lam({ color: 0x4b3f33 }), 0.2, 0.62, 1.0, rig).rotation.x = Math.PI / 2;
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x1b1612 });
  const glass = add(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 8), glassMat, 0.2, 0.62, 1.58, rig);
  glass.rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 6), lam({ color: 0x8a3b24 }), 1.26, 0.75, 0.35, rig).rotation.z = Math.PI / 2;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    add(new THREE.BoxGeometry(0.22, 0.12, 0.22), lam({ color: 0x1f1914 }), x * 0.95, 0.06, z * 0.62, rig);
  }
  const lamp = new THREE.PointLight(0xfff0c8, 0, 5, 0);
  lamp.position.set(0.2, 0.62, 2.2);
  rig.add(lamp);

  // Beam: a pyramid from the lens to the screen's corners, additive like an old-console fake volumetric
  scene.updateMatrixWorld(true);
  const lensW = new THREE.Vector3();
  glass.getWorldPosition(lensW);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(
    ([cx, cy]) => new THREE.Vector3(SCX + (cx * SW) / 2, SCY + (cy * SH) / 2, SCZ + 0.01),
  );
  const beamPos: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    beamPos.push(lensW.x, lensW.y, lensW.z, a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(beamPos, 3));
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c8,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  scene.add(new THREE.Mesh(beamGeo, beamMat));
  const slotW = new THREE.Vector3();
  slot.getWorldPosition(slotW);

  // Binder
  const BX = -2.1, BZ = 1.15;
  add(new THREE.BoxGeometry(3.4, 0.08, 2.5), lam({ color: 0x2a3f5c }), BX, 0.04, BZ);
  add(new THREE.BoxGeometry(0.5, 0.14, 2.5), lam({ color: 0x223349 }), BX - 1.95, 0.07, BZ);
  const ringMat = lam({ color: 0xb9ae9e });
  for (const dz of [-0.75, 0, 0.75]) {
    add(new THREE.TorusGeometry(0.16, 0.04, 4, 8), ringMat, BX - 1.62, 0.2, BZ + dz).rotation.y = Math.PI / 2;
  }
  add(
    new THREE.BoxGeometry(3.0, 0.02, 2.2),
    new THREE.MeshBasicMaterial({ color: 0xf0e8dc, transparent: true, opacity: 0.12 }),
    BX + 0.05,
    0.1,
    BZ,
  );

  interface SlideData {
    id: string;
    home: THREE.Vector3;
    seated: boolean;
  }
  const slides = opts.slides.map((d, i) => {
    const t = tex(16, 16, (g) => {
      g.fillStyle = '#efe8da';
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = d.light;
      g.fillRect(3, 3, 10, 7);
      g.fillStyle = '#3a2e22';
      for (let k = 0; k < Number(d.n); k++) g.fillRect(3 + k * 2, 12, 1, 2);
    });
    const face = lam({ map: t });
    const edge = lam({ color: 0xe0d6c4 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), [edge, edge, face, edge, edge, edge]);
    const col = i % 3, row = Math.floor(i / 3);
    const home = new THREE.Vector3(BX - 0.9 + col * 1.0, 0.15, BZ - 0.5 + row * 1.0);
    m.position.copy(home);
    m.userData = { id: d.id, home, seated: false } satisfies SlideData;
    scene.add(m);
    return m;
  });
  const sd = (m: THREE.Object3D) => m.userData as SlideData;

  // State + input
  const st = {
    current: null as string | null,
    light: new THREE.Color(0xffffff),
    glow: 0,
    hover: null as string | null,
    drag: null as THREE.Mesh | null,
    dragPos: new THREE.Vector3(),
    downAt: { x: 0, y: 0 },
    moved: 0,
    over: false,
    t: 0,
  };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);
  const setRay = (ev: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const hitSlide = () => {
    const h = ray.intersectObjects(slides, false);
    return h.length ? (h[0].object as THREE.Mesh) : null;
  };
  const nearProjector = (p: THREE.Vector3) => Math.hypot(p.x - PX, p.z - PZ) < 1.1;

  const onDown = (ev: PointerEvent) => {
    setRay(ev);
    const s = hitSlide();
    if (!s) return;
    st.drag = s;
    st.downAt = { x: ev.clientX, y: ev.clientY };
    st.moved = 0;
    ray.ray.intersectPlane(deskPlane, st.dragPos);
    canvas.setPointerCapture(ev.pointerId);
    opts.onDragState(true, false);
  };
  const onMove = (ev: PointerEvent) => {
    setRay(ev);
    if (st.drag) {
      st.moved = Math.hypot(ev.clientX - st.downAt.x, ev.clientY - st.downAt.y);
      const p = new THREE.Vector3();
      if (ray.ray.intersectPlane(deskPlane, p)) st.dragPos.copy(p);
      const over = st.moved > 6 && nearProjector(st.dragPos);
      if (over !== st.over) {
        st.over = over;
        opts.onDragState(true, over);
      }
      return;
    }
    const s = hitSlide();
    const id = s ? sd(s).id : null;
    if (id !== st.hover) {
      st.hover = id;
      opts.onHover(id);
    }
  };
  const onUp = (ev: PointerEvent) => {
    if (!st.drag) return;
    const s = st.drag;
    st.drag = null;
    if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
    if (st.moved < 6 || nearProjector(st.dragPos)) opts.onLoad(sd(s).id);
    st.over = false;
    opts.onDragState(false, false);
  };
  const onLeave = () => {
    if (!st.drag && st.hover) {
      st.hover = null;
      opts.onHover(null);
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  // Loop
  const offColor = new THREE.Color(0x4a443b);
  const tmpV = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  let lastRect = '';
  let last = performance.now();
  let raf = 0;
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    st.t += dt;
    const k = reduce ? 1 : Math.min(1, dt * 7);

    for (const m of slides) {
      const u = sd(m);
      const inserted = st.current === u.id && st.drag !== m;
      let rotX = 0, rotY = 0;
      if (st.drag === m) tmpV.copy(st.dragPos).setY(0.75);
      else if (inserted) {
        tmpV.set(slotW.x, slotW.y + 0.28, slotW.z);
        rotX = Math.PI / 2;
        rotY = aim.rotation.y + Math.PI / 2;
      } else tmpV.copy(u.home).setY(u.home.y + (st.hover === u.id && !reduce ? 0.14 + Math.sin(st.t * 6) * 0.03 : 0));
      const dist = Math.hypot(m.position.x - tmpV.x, m.position.z - tmpV.z);
      m.position.x += (tmpV.x - m.position.x) * k;
      m.position.z += (tmpV.z - m.position.z) * k;
      const arc = st.drag === m || reduce ? 0 : Math.min(dist, 2.5) * 0.45;
      m.position.y += (tmpV.y + arc - m.position.y) * k;
      m.rotation.x += (rotX - m.rotation.x) * k;
      m.rotation.y += (rotY - m.rotation.y) * k;
      u.seated = inserted && dist < 0.08;
    }

    const cur = slides.find((m) => sd(m).id === st.current);
    const target = cur && sd(cur).seated ? 1 : 0;
    st.glow += (target - st.glow) * (reduce ? 1 : Math.min(1, dt * 4));
    const flick = reduce ? 1 : 0.93 + Math.random() * 0.07;
    rig.position.y = st.over && !reduce ? Math.abs(Math.sin(st.t * 9)) * 0.12 : 0;
    lamp.intensity = st.glow * 2.0 * Math.PI * flick;
    beamMat.opacity = st.glow * 0.11 * flick;
    glassMat.color.setRGB(0.1 + st.glow * 0.9, 0.08 + st.glow * 0.86, 0.07 + st.glow * 0.7);
    screenMat.color.copy(offColor).lerp(st.light, st.glow);
    screenLight.color.copy(st.light);
    screenLight.intensity = st.glow * 1.3 * Math.PI * flick;
    renderer.render(scene, camera);

    // Report where the 3D screen sits on the page, so HTML content can be pinned to it.
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of corners) {
      tmpP.copy(c).project(camera);
      const x = ((tmpP.x + 1) / 2) * cw, y = ((1 - tmpP.y) / 2) * ch;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const key = `${Math.round(minX)},${Math.round(minY)},${Math.round(maxX)},${Math.round(maxY)},${st.glow.toFixed(2)}`;
    if (key !== lastRect) {
      lastRect = key;
      opts.onScreenRect({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }, st.glow);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    setCurrent(id) {
      st.current = id;
      const d = opts.slides.find((s) => s.id === id);
      if (d) st.light.set(d.light);
    },
    dispose() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      renderer.dispose();
    },
  };
}
