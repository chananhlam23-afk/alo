"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isDark = document.documentElement.getAttribute("data-theme") !== "light";

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 2000);
    camera.position.set(0, 0, 90);

    // Chế độ "lite": tôn trọng prefers-reduced-motion / máy yếu / màn nhỏ
    // → render 1 khung tĩnh, KHÔNG chạy vòng lặp animation (đỡ lag/nóng máy/tụt pin).
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const lite =
      prefersReduced ||
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      window.innerWidth < 900;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    /* ── Color palette (adapts to theme) ────────────────────────── */
    const COLORS_DARK  = [0x6366f1, 0x22d3ee, 0xa78bfa, 0x34d399, 0xf472b6];
    const COLORS_LIGHT = [0x4f46e5, 0x0891b2, 0x7c3aed, 0x059669, 0xdb2777];
    const NEON_COLORS  = isDark ? COLORS_DARK : COLORS_LIGHT;
    const lineColor    = isDark ? 0x1e293b : 0xc7d2fe;
    const starColor    = isDark ? 0x334155 : 0xa5b4fc;

    /* ── Vietnam city nodes ──────────────────────────────────────── */
    const nodePositions: [number, number, number][] = [
      [0,   35,  0],   // Hà Nội
      [-8,  22,  0],   // Thanh Hóa
      [-6,  10,  0],   // Vinh
      [-2,   0,  0],   // Đà Nẵng
      [4,  -12,  0],   // Quy Nhơn
      [2,  -28,  0],   // Đà Lạt
      [-10,-36,  0],   // TP.HCM
      [8,  -38,  0],   // Vũng Tàu
      [-18,-30,  0],   // Cần Thơ
    ];

    const nodes: THREE.Mesh[] = [];
    const rings: THREE.Mesh[] = [];

    nodePositions.forEach((pos, i) => {
      const color = NEON_COLORS[i % NEON_COLORS.length];

      /* Core sphere */
      const geo  = new THREE.SphereGeometry(1.0, 16, 16);
      const mat  = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      scene.add(mesh);
      nodes.push(mesh);

      /* Outer glow ring */
      const rGeo = new THREE.RingGeometry(1.4, 2.2, 32);
      const rMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.position.set(...pos);
      scene.add(ring);
      rings.push(ring);

      /* 2nd outer ring – slower pulse */
      const r2Geo = new THREE.RingGeometry(2.4, 3.0, 32);
      const r2Mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
      });
      const ring2 = new THREE.Mesh(r2Geo, r2Mat);
      ring2.position.set(...pos);
      scene.add(ring2);
      rings.push(ring2);
    });

    /* ── Curved route splines ────────────────────────────────────── */
    const edges: [number, number][] = [
      [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[6,8],
    ];

    const lineObjects: {
      line: THREE.Line;
      points: THREE.Vector3[];
    }[] = [];

    edges.forEach(([a, b]) => {
      const p0 = new THREE.Vector3(...nodePositions[a]);
      const p1 = new THREE.Vector3(...nodePositions[b]);

      /* Add a mid control point for slight curve */
      const mid = p0.clone().lerp(p1, 0.5);
      mid.x += (Math.random() - 0.5) * 6;
      mid.z += 10; // pop out slightly in Z for 3D feel

      const curve  = new THREE.QuadraticBezierCurve3(p0, mid, p1);
      const points = curve.getPoints(40);
      const geo    = new THREE.BufferGeometry().setFromPoints(points);
      const mat    = new THREE.LineBasicMaterial({
        color: lineColor, transparent: true, opacity: 0.45,
      });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      lineObjects.push({ line, points });
    });

    /* ── Moving vehicle dots along curves ───────────────────────── */
    type Vehicle = {
      mesh: THREE.Mesh;
      curve: THREE.QuadraticBezierCurve3;
      t: number;
      speed: number;
    };

    const vehicles: Vehicle[] = [];

    edges.forEach(([a, b]) => {
      const p0  = new THREE.Vector3(...nodePositions[a]);
      const p1  = new THREE.Vector3(...nodePositions[b]);
      const mid = p0.clone().lerp(p1, 0.5);
      mid.x += (Math.random() - 0.5) * 6;
      mid.z += 10;
      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);

      const count = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < count; i++) {
        const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
        const vGeo  = new THREE.SphereGeometry(0.45, 8, 8);
        const vMat  = new THREE.MeshBasicMaterial({ color });
        const mesh  = new THREE.Mesh(vGeo, vMat);
        scene.add(mesh);
        vehicles.push({ mesh, curve, t: Math.random(), speed: 0.002 + Math.random() * 0.004 });
      }
    });

    /* ── Star field particles ────────────────────────────────────── */
    const starGeo   = new THREE.BufferGeometry();
    const starCount = lite ? 90 : 180;
    const starPos   = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 320;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 320;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: starColor, size: 0.35 });
    scene.add(new THREE.Points(starGeo, starMat));

    /* ── Floating hexagonal plane ────────────────────────────────── */
    const hexGeo = new THREE.TorusGeometry(55, 0.4, 6, 6);
    const hexMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x1e293b : 0xc7d2fe,
      transparent: true, opacity: 0.12, wireframe: true,
    });
    const hexMesh = new THREE.Mesh(hexGeo, hexMat);
    hexMesh.rotation.x = Math.PI / 3;
    scene.add(hexMesh);

    /* ── Icosahedron wireframe (3D depth) ────────────────────────── */
    const icoGeo  = new THREE.IcosahedronGeometry(28, 1);
    const icoMat  = new THREE.MeshBasicMaterial({
      color: isDark ? 0x6366f1 : 0x4f46e5,
      transparent: true, opacity: 0.04, wireframe: true,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    scene.add(icoMesh);

    /* ── Animation loop ──────────────────────────────────────────── */
    let frame = 0;
    let raf = 0;
    let mouseX = 0, mouseY = 0;
    const tmpVec = new THREE.Vector3();

    const renderFrame = () => {
      frame++;

      /* Pulse nodes */
      nodes.forEach((node, i) => {
        const s = 1 + 0.18 * Math.sin(frame * 0.04 + i * 1.3);
        node.scale.setScalar(s);
      });

      /* Pulse rings */
      rings.forEach((ring, i) => {
        const s = 1 + 0.12 * Math.sin(frame * 0.025 + i * 0.7);
        ring.scale.setScalar(s);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          (0.15 + 0.12 * Math.sin(frame * 0.03 + i)) * (isDark ? 1 : 0.7);
      });

      /* Move vehicles along curves */
      vehicles.forEach((v) => {
        v.t += v.speed;
        if (v.t > 1) v.t -= 1;
        v.curve.getPoint(v.t, tmpVec);
        v.mesh.position.copy(tmpVec);
        v.mesh.position.z += 1.5 * Math.sin(frame * 0.06 + v.t * 10);
      });

      /* Rotate decorative meshes */
      hexMesh.rotation.z += 0.0008;
      icoMesh.rotation.x += 0.0006;
      icoMesh.rotation.y += 0.001;

      /* Parallax camera on mouse + gentle drift */
      camera.position.x += (mouseX * 6 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 4 - camera.position.y + 1) * 0.03;
      camera.position.x += Math.sin(frame * 0.0015) * 0.04;
      camera.position.y += Math.cos(frame * 0.001) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // LITE: vẽ đúng 1 khung tĩnh rồi dừng — không RAF, không nghe chuột.
    if (lite) {
      renderer.render(scene, camera);
      return () => {
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      };
    }

    const onMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    // Cap ~30fps: chỉ render mỗi khung chẵn.
    let tickCount = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (tickCount++ % 2 === 0) renderFrame();
    };

    // Pause hẳn khi tab ẩn (đỡ tốn CPU/GPU/pin).
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { animate(); }
    };
    document.addEventListener("visibilitychange", onVisibility);

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}
      aria-hidden="true"
    />
  );
}
