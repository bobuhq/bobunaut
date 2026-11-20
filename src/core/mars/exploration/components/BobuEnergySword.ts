import * as THREE from "three";

export type BobuSwordMounts = {
  hand: THREE.Group;
  back: THREE.Group;
  dispose: () => void;
};

function makeSword(open: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = open ? "BOBU_Sword_Active" : "BOBU_Sword_Stored";

  const metal = new THREE.MeshStandardMaterial({
    color: 0x202337,
    metalness: 0.82,
    roughness: 0.22,
  });

  const violet = new THREE.MeshStandardMaterial({
    color: 0xa248ff,
    emissive: 0x7723ff,
    emissiveIntensity: 2.4,
    metalness: 0.2,
    roughness: 0.18,
  });

  const cyan = new THREE.MeshStandardMaterial({
    color: 0x66eaff,
    emissive: 0x39cfff,
    emissiveIntensity: 2.6,
    roughness: 0.12,
  });

  const glow = new THREE.MeshBasicMaterial({
    color: 0x9655ff,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  function cylinder(
    name: string,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    y: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radiusTop, radiusBottom, height, 12,
      ),
      material,
    );
    mesh.name = name;
    mesh.position.y = y;
    group.add(mesh);
    return mesh;
  }

  cylinder("SwordGrip", 0.033, 0.037, 0.19, 0, metal);
  cylinder("SwordGripCore", 0.039, 0.039, 0.025, -0.065, violet);
  cylinder("SwordEmitter", 0.067, 0.048, 0.043, 0.112, metal);
  cylinder("SwordEmitterLight", 0.048, 0.048, 0.018, 0.140, cyan);

  if (open) {
    cylinder("EnergyBladeOuter", 0.008, 0.039, 0.67, 0.488, glow);
    cylinder("EnergyBladeViolet", 0.006, 0.025, 0.65, 0.486, violet);
    cylinder("EnergyBladeCore", 0.003, 0.011, 0.63, 0.480, cyan);
  }

  group.traverse((item) => {
    if (item instanceof THREE.Mesh) {
      item.castShadow = true;
    }
  });

  group.userData.disposeSword = () => {
    group.traverse((item) => {
      if (item instanceof THREE.Mesh) {
        item.geometry.dispose();
      }
    });
    metal.dispose();
    violet.dispose();
    cyan.dispose();
    glow.dispose();
  };

  return group;
}

export function attachBobuEnergySword(
  character: THREE.Object3D,
): BobuSwordMounts | null {
  const handBone = character.getObjectByName("mixamorig:RightHand");
  const backBone = character.getObjectByName("mixamorig:Spine2");

  if (!handBone || !backBone) {
    console.warn("BOBU sword: hand/spine bones unavailable");
    return null;
  }

  const hand = makeSword(true);
  const back = makeSword(false);

  // Placement is relative to the rig's bones and will be
  // fine-tuned after visual inspection in the local ARES scene.
  hand.position.set(0.015, 0.025, 0.025);
  hand.rotation.set(Math.PI / 2, 0, Math.PI / 2);

  back.position.set(0.11, 0.02, -0.12);
  back.rotation.set(0.12, 0, -0.70);

  hand.visible = false;
  back.visible = true;

  handBone.add(hand);
  backBone.add(back);

  return {
    hand,
    back,
    dispose() {
      hand.removeFromParent();
      back.removeFromParent();
      hand.userData.disposeSword?.();
      back.userData.disposeSword?.();
    },
  };
}
