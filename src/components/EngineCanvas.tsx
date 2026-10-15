import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Grid } from "@react-three/drei";
import * as THREE from "three";
import { PartId, PartStatus } from "../types";
import { ENGINE_PARTS } from "../data/parts";
import { Maximize2, Minimize2, RotateCcw, Tag } from "lucide-react";

interface EngineCanvasProps {
  selectedPartId: PartId | null;
  onSelectPart: (partId: PartId) => void;
  partStatuses?: Record<PartId, PartStatus>;
  allowMultiSelect?: boolean;
  multiSelectedParts?: PartId[];
  onToggleMultiSelectPart?: (partId: PartId) => void;
  theme?: "dark" | "light";
}

// Color palettes for statuses
const STATUS_COLORS: Record<PartStatus, { base: string; emissive: string; intensity: number }> = {
  default: { base: "#64748b", emissive: "#0f172a", intensity: 0.1 },
  affected: { base: "#ef4444", emissive: "#dc2626", intensity: 0.65 },
  inspect: { base: "#f59e0b", emissive: "#d97706", intensity: 0.55 },
  unaffected: { base: "#10b981", emissive: "#059669", intensity: 0.45 },
};

interface PartMeshProps {
  id: PartId;
  name: string;
  baseZ: number;
  explodedZ: number;
  isExploded: boolean;
  isSelected: boolean;
  isHovered: boolean;
  status: PartStatus;
  onHover: (id: PartId | null) => void;
  onClick: (id: PartId) => void;
  showLabel: boolean;
}

interface MeshComponentProps {
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  status: PartStatus;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

// 1. Fan Blades (hub + 18 angled aerodynamic blades)
function FanBladesMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bladeCount = 18;

  // Slowly rotate the fan blades in the assembly
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.4;
    }
  });

  const material = useMemo(() => {
    const col = STATUS_COLORS[status];
    const isSpecial = isSelected || isHovered;
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.7 : col.intensity,
      metalness: 0.85,
      roughness: 0.25,
    });
  }, [status, isSelected, isHovered]);

  const blades = useMemo(() => {
    const arr = [];
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2;
      arr.push(
        <group key={i} rotation={[0, 0, angle]}>
          <mesh position={[0, 0.95, 0]} rotation={[0.3, 0.1, 0.05]}>
            <boxGeometry args={[0.18, 1.2, 0.04]} />
            <primitive object={material} attach="material" />
          </mesh>
        </group>
      );
    }
    return arr;
  }, [material]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <group ref={groupRef}>
        {/* Central Spinner Nose Cone */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.3]}>
          <coneGeometry args={[0.42, 0.9, 32]} />
          <primitive object={material} attach="material" />
        </mesh>
        {/* Fan Hub Rotor Disc */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.48, 0.48, 0.35, 32]} />
          <primitive object={material} attach="material" />
        </mesh>
        {blades}
      </group>
    </group>
  );
}

// 2. Fan Case / Nacelle (large hollow cylinder, semi-transparent)
function FanCaseMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.6 : col.intensity,
      metalness: 0.7,
      roughness: 0.3,
      transparent: true,
      opacity: isSpecial ? 0.65 : 0.38,
      side: THREE.DoubleSide,
    });
  }, [status, isSpecial, col]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Outer Nacelle Cowling */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.75, 1.82, 1.2, 36, 1, true]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Structural Ring Flanges */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.58]}>
        <torusGeometry args={[1.76, 0.05, 16, 40]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.58]}>
        <torusGeometry args={[1.83, 0.05, 16, 40]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

// 3. Fan Drive Gear System (small gear-like cylinder with planet gears)
function FanDriveGearMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.65 : col.intensity,
      metalness: 0.9,
      roughness: 0.2,
    });
  }, [status, isSpecial, col]);

  const planetGears = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const x = Math.cos(angle) * 0.32;
      const y = Math.sin(angle) * 0.32;
      arr.push(
        <mesh key={i} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.32, 16]} />
          <primitive object={material} attach="material" />
        </mesh>
      );
    }
    return arr;
  }, [material]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Sun Gear & Carrier Casing */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.38, 24]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.15, 20]} />
        <primitive object={material} attach="material" />
      </mesh>
      {planetGears}
    </group>
  );
}

// 4. Low-Pressure Compressor (Booster) - short tapered cylinder with blade rings
function LpcMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.6 : col.intensity,
      metalness: 0.85,
      roughness: 0.3,
    });
  }, [status, isSpecial, col]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.62, 0.54, 0.55, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Blade rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.16]}>
        <torusGeometry args={[0.66, 0.045, 12, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.16]}>
        <torusGeometry args={[0.58, 0.045, 12, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

// 5. High-Pressure Compressor - tapered cylinder with blade rings
function HpcMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.6 : col.intensity,
      metalness: 0.88,
      roughness: 0.26,
    });
  }, [status, isSpecial, col]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.52, 0.44, 0.95, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* 5 Distinct Blade Stages */}
      {[-0.35, -0.18, 0, 0.18, 0.35].map((z, idx) => (
        <mesh key={idx} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]}>
          <torusGeometry args={[0.49 + idx * 0.015, 0.038, 12, 32]} />
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// 6. Combustor - torus/ring shape, orange tint
function CombustorMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : status === "default" ? "#ea580c" : col.base,
      emissive: isSpecial ? "#0284c7" : status === "default" ? "#9a3412" : col.emissive,
      emissiveIntensity: isSpecial ? 0.7 : status === "default" ? 0.5 : col.intensity,
      metalness: 0.75,
      roughness: 0.35,
    });
  }, [status, isSpecial, col]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.16, 24, 36]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Fuel Nozzle Ports around rim */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.54, Math.sin(a) * 0.54, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.04, 0.04, 0.12, 10]} />
            <primitive object={material} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}

// 7. High-Pressure Turbine - short cylinder with blade ring
function HptMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.6 : col.intensity,
      metalness: 0.9,
      roughness: 0.22,
    });
  }, [status, isSpecial, col]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.49, 0.49, 0.32, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]}>
        <torusGeometry args={[0.55, 0.05, 14, 36]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

// 8. Low-Pressure Turbine - larger cylinder with blade rings
function LptMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.6 : col.intensity,
      metalness: 0.88,
      roughness: 0.28,
    });
  }, [status, isSpecial, col]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.62, 0.52, 0.75, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      {[-0.22, 0, 0.22].map((z, idx) => (
        <mesh key={idx} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]}>
          <torusGeometry args={[0.56 + idx * 0.04, 0.04, 14, 32]} />
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// 9. Exhaust Nozzle & Tail Cone - cone plus outer ring
function ExhaustMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.6 : col.intensity,
      metalness: 0.8,
      roughness: 0.35,
    });
  }, [status, isSpecial, col]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Outer Nozzle Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.68, 0.74, 0.65, 32, 1, true]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Aerodynamic Center Tail Cone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.4]}>
        <coneGeometry args={[0.38, 0.95, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

// 10. Oil System - thin pipe running along the side with a small tank
function OilSystemMesh({
  position,
  isSelected,
  isHovered,
  status,
  onPointerOver,
  onPointerOut,
  onClick,
}: MeshComponentProps) {
  const isSpecial = isSelected || isHovered;
  const col = STATUS_COLORS[status];

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSpecial ? "#38bdf8" : status === "default" ? "#94a3b8" : col.base,
      emissive: isSpecial ? "#0284c7" : col.emissive,
      emissiveIntensity: isSpecial ? 0.65 : col.intensity,
      metalness: 0.92,
      roughness: 0.2,
    });
  }, [status, isSpecial, col]);

  return (
    <group
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Oil Reservoir Tank */}
      <mesh position={[0.75, -0.65, 0.2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.52, 20]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Rigid Conduit Pipe Line */}
      <mesh position={[0.75, -0.65, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.8, 12]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Filter / Valve Block */}
      <mesh position={[0.75, -0.65, -0.4]}>
        <boxGeometry args={[0.18, 0.22, 0.18]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

// Scene Root with Auto-Rotation until interacted
function EngineScene({
  selectedPartId,
  onSelectPart,
  partStatuses = {} as Record<PartId, PartStatus>,
  isExploded,
  showLabels,
  hoveredPartId,
  setHoveredPartId,
  allowMultiSelect,
  multiSelectedParts = [],
  onToggleMultiSelectPart,
  theme = "dark",
}: {
  selectedPartId: PartId | null;
  onSelectPart: (partId: PartId) => void;
  partStatuses: Record<PartId, PartStatus>;
  isExploded: boolean;
  showLabels: boolean;
  hoveredPartId: PartId | null;
  setHoveredPartId: (id: PartId | null) => void;
  allowMultiSelect?: boolean;
  multiSelectedParts?: PartId[];
  onToggleMultiSelectPart?: (partId: PartId) => void;
  theme?: "dark" | "light";
}) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  useFrame((_, delta) => {
    if (!userInteracted && rootGroupRef.current) {
      rootGroupRef.current.rotation.y += delta * 0.15;
    }
  });

  const handlePointerDown = () => {
    setUserInteracted(true);
  };

  const handlePartClick = (id: PartId) => {
    setUserInteracted(true);
    if (allowMultiSelect && onToggleMultiSelectPart) {
      onToggleMultiSelectPart(id);
    } else {
      onSelectPart(id);
    }
  };

  // Base and Exploded Z coordinates along engine axis
  const partsLayout: Array<{
    id: PartId;
    baseZ: number;
    explodedZ: number;
    labelY: number;
    component: React.ComponentType<any>;
  }> = [
    { id: "fan_blades", baseZ: 2.3, explodedZ: 4.2, labelY: 1.4, component: FanBladesMesh },
    { id: "fan_case", baseZ: 2.1, explodedZ: 3.2, labelY: 2.0, component: FanCaseMesh },
    { id: "fan_drive_gear", baseZ: 1.35, explodedZ: 2.0, labelY: 0.9, component: FanDriveGearMesh },
    { id: "lpc", baseZ: 0.8, explodedZ: 1.1, labelY: 1.0, component: LpcMesh },
    { id: "hpc", baseZ: 0.0, explodedZ: 0.0, labelY: 0.9, component: HpcMesh },
    { id: "combustor", baseZ: -0.85, explodedZ: -1.0, labelY: 0.9, component: CombustorMesh },
    { id: "hpt", baseZ: -1.4, explodedZ: -1.9, labelY: 0.9, component: HptMesh },
    { id: "lpt", baseZ: -2.1, explodedZ: -2.9, labelY: 1.0, component: LptMesh },
    { id: "exhaust", baseZ: -3.0, explodedZ: -4.3, labelY: 1.1, component: ExhaustMesh },
    { id: "oil_system", baseZ: 0.0, explodedZ: 0.0, labelY: -1.1, component: OilSystemMesh },
  ];

  return (
    <group ref={rootGroupRef} onPointerDown={handlePointerDown}>
      {partsLayout.map((p) => {
        const currentZ = isExploded ? p.explodedZ : p.baseZ;
        const status = partStatuses[p.id] || "default";
        const isSelected = allowMultiSelect
          ? multiSelectedParts.includes(p.id)
          : selectedPartId === p.id;
        const isHovered = hoveredPartId === p.id;
        const Component = p.component;

        return (
          <group key={p.id}>
            <Component
              position={[0, 0, currentZ]}
              isSelected={isSelected}
              isHovered={isHovered}
              status={status}
              onPointerOver={(e: any) => {
                e.stopPropagation();
                setHoveredPartId(p.id);
              }}
              onPointerOut={(e: any) => {
                e.stopPropagation();
                if (hoveredPartId === p.id) setHoveredPartId(null);
              }}
              onClick={(e: any) => {
                e.stopPropagation();
                handlePartClick(p.id);
              }}
            />

            {/* Labels pinned to parts */}
            {showLabels && (
              <Html
                position={[0, p.labelY, currentZ]}
                center
                distanceFactor={10}
                style={{ pointerEvents: "none" }}
              >
                <div
                  className={`px-2 py-0.5 text-[11px] font-mono tracking-tight rounded-md backdrop-blur-md border whitespace-nowrap transition-all duration-200 shadow-lg ${
                    isSelected
                      ? "bg-sky-500 text-white border-sky-300 font-semibold scale-105 shadow-sky-500/30"
                      : isHovered
                      ? theme === "light"
                        ? "bg-white text-sky-600 border-sky-400 shadow-md font-semibold"
                        : "bg-slate-900/90 text-sky-400 border-sky-500/50"
                      : theme === "light"
                      ? "bg-white/95 text-slate-800 border-slate-300 shadow-sm"
                      : "bg-slate-950/80 text-slate-300 border-slate-700/60"
                  }`}
                >
                  {ENGINE_PARTS[p.id]?.name || p.id}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Subtle floor grid */}
      <Grid
        position={[0, -1.85, 0]}
        args={[14, 14]}
        cellSize={0.6}
        cellThickness={1}
        cellColor={theme === "light" ? "#cbd5e1" : "#1e293b"}
        sectionSize={2.4}
        sectionThickness={1.5}
        sectionColor={theme === "light" ? "#94a3b8" : "#334155"}
        fadeDistance={25}
        fadeStrength={1.5}
      />
    </group>
  );
}

export function EngineCanvas({
  selectedPartId,
  onSelectPart,
  partStatuses = {} as Record<PartId, PartStatus>,
  allowMultiSelect = false,
  multiSelectedParts = [],
  onToggleMultiSelectPart,
  theme = "dark",
}: EngineCanvasProps) {
  const [isExploded, setIsExploded] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredPartId, setHoveredPartId] = useState<PartId | null>(null);
  const controlsRef = useRef<any>(null);

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const hoveredPartName = hoveredPartId ? ENGINE_PARTS[hoveredPartId]?.name : null;

  return (
    <div
      id="engine-canvas-container"
      className={`relative w-full h-full overflow-hidden select-none transition-colors duration-300 ${
        theme === "light" ? "bg-[#f8fafc]" : "bg-[#070b14]"
      }`}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [5.2, 2.4, 4.8], fov: 42, near: 0.1, far: 100 }}
        className="cursor-grab active:cursor-grabbing"
      >
        <color attach="background" args={[theme === "light" ? "#f8fafc" : "#070b14"]} />
        <ambientLight intensity={theme === "light" ? 1.2 : 0.85} />
        <directionalLight position={[10, 15, 10]} intensity={theme === "light" ? 1.6 : 1.5} castShadow />
        <directionalLight position={[-10, 5, -10]} intensity={0.75} color={theme === "light" ? "#cbd5e1" : "#94a3b8"} />
        <pointLight position={[0, -2, 0]} intensity={0.4} color="#0284c7" />

        <EngineScene
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
          partStatuses={partStatuses}
          isExploded={isExploded}
          showLabels={showLabels}
          hoveredPartId={hoveredPartId}
          setHoveredPartId={setHoveredPartId}
          allowMultiSelect={allowMultiSelect}
          multiSelectedParts={multiSelectedParts}
          onToggleMultiSelectPart={onToggleMultiSelectPart}
          theme={theme}
        />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={2.5}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2 + 0.15}
        />
      </Canvas>

      {/* Floating Canvas Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl">
        <button
          id="btn-reset-view"
          onClick={handleResetView}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded transition"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
          <span>Reset</span>
        </button>

        <button
          id="btn-toggle-labels"
          onClick={() => setShowLabels(!showLabels)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition ${
            showLabels
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
              : "text-slate-400 hover:text-slate-200 bg-slate-800/60"
          }`}
          title="Toggle Part Labels"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Labels</span>
        </button>

        <button
          id="btn-toggle-exploded"
          onClick={() => setIsExploded(!isExploded)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition ${
            isExploded
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "text-slate-400 hover:text-slate-200 bg-slate-800/60"
          }`}
          title="Toggle Exploded Assembly View"
        >
          {isExploded ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
          <span>{isExploded ? "Assemble" : "Exploded"}</span>
        </button>
      </div>

      {/* Hover Tooltip Bar */}
      {hoveredPartName && (
        <div className="absolute bottom-14 left-4 z-10 pointer-events-none bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-sky-500/40 text-xs text-sky-300 font-mono shadow-xl animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          <span>{hoveredPartName}</span>
          <span className="text-[10px] text-slate-400">(Click to inspect)</span>
        </div>
      )}

      {/* Status Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/90 text-[11px] text-slate-300 shadow-xl">
        <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Status:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          <span>Default</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
          <span>Unaffected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
          <span>Inspect</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]"></span>
          <span>Affected</span>
        </div>
      </div>
    </div>
  );
}
