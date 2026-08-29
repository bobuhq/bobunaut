import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path.cwd()
OUT_DIR = ROOT / "public" / "models" / "bobu"
GLB_PATH = OUT_DIR / "bobu-explorer-v1.glb"
BLEND_PATH = OUT_DIR / "source" / "bobu-explorer-v1.blend"

OUT_DIR.mkdir(parents=True, exist_ok=True)
BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, metallic=0.0, roughness=0.45, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness

    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength

    return mat

MAT_BLACK = material(
    "BOBU_Suit_Black",
    (0.012, 0.015, 0.035),
    metallic=0.55,
    roughness=0.28,
)

MAT_DARK = material(
    "BOBU_Armor_Dark",
    (0.025, 0.035, 0.085),
    metallic=0.65,
    roughness=0.24,
)

MAT_FACE = material(
    "BOBU_Face_Purple",
    (0.34, 0.18, 0.62),
    metallic=0.05,
    roughness=0.34,
)

MAT_PURPLE = material(
    "BOBU_Purple_Glow",
    (0.42, 0.14, 0.95),
    metallic=0.2,
    roughness=0.22,
    emission=(0.42, 0.10, 1.0),
    emission_strength=3.0,
)

MAT_CYAN = material(
    "BOBU_Cyan_Glow",
    (0.02, 0.55, 1.0),
    metallic=0.2,
    roughness=0.2,
    emission=(0.02, 0.45, 1.0),
    emission_strength=2.2,
)

MAT_EYE = material(
    "BOBU_Eye_Black",
    (0.001, 0.001, 0.004),
    metallic=0.05,
    roughness=0.12,
)

MAT_WHITE = material(
    "BOBU_Eye_Highlight",
    (1.0, 1.0, 1.0),
    metallic=0.0,
    roughness=0.15,
)

MAT_GOLD = material(
    "BOBU_Ear_Gold",
    (0.72, 0.31, 0.06),
    metallic=0.82,
    roughness=0.22,
)

MAT_CHEEK = material(
    "BOBU_Cheek",
    (0.55, 0.16, 0.30),
    metallic=0.0,
    roughness=0.45,
)

def smooth(obj):
    if obj.type == "MESH":
        for poly in obj.data.polygons:
            poly.use_smooth = True

def add_uv(name, loc, scale, mat, segments=64, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=loc,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(
        location=False,
        rotation=False,
        scale=True,
    )
    smooth(obj)
    obj.data.materials.append(mat)
    return obj

def add_cube(name, loc, scale, mat, bevel=0.18):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(
        location=False,
        rotation=False,
        scale=True,
    )

    bevel_mod = obj.modifiers.new("Soft_Bevel", "BEVEL")
    bevel_mod.width = bevel
    bevel_mod.segments = 4

    smooth(obj)
    obj.data.materials.append(mat)
    return obj

def add_cylinder(name, loc, radius, depth, mat, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=radius,
        depth=depth,
        location=loc,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    smooth(obj)
    obj.data.materials.append(mat)
    return obj

def add_torus(name, loc, major, minor, mat, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=64,
        minor_segments=20,
        location=loc,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    smooth(obj)
    obj.data.materials.append(mat)
    return obj

root = bpy.data.objects.new("BOBU_Explorer_V1", None)
bpy.context.collection.objects.link(root)

head = add_uv(
    "Head",
    (0, 0, 1.48),
    (0.55, 0.46, 0.50),
    MAT_FACE,
)
head.parent = root

helmet = add_uv(
    "Helmet_Shell",
    (0, 0.025, 1.58),
    (0.59, 0.49, 0.53),
    MAT_BLACK,
)
helmet.parent = root

face_mask = add_uv(
    "Face_Panel",
    (0, -0.405, 1.465),
    (0.485, 0.080, 0.405),
    MAT_FACE,
)
face_mask.parent = root

for side in (-1, 1):
    x = side * 0.205

    eye = add_uv(
        f"Eye_{'L' if side < 0 else 'R'}",
        (x, -0.492, 1.545),
        (0.140, 0.026, 0.182),
        MAT_EYE,
    )
    eye.parent = root

    hi = add_uv(
        f"Eye_Highlight_{'L' if side < 0 else 'R'}",
        (x - 0.038, -0.519, 1.605),
        (0.027, 0.009, 0.034),
        MAT_WHITE,
        32,
        16,
    )
    hi.parent = root

    cheek = add_uv(
        f"Cheek_{'L' if side < 0 else 'R'}",
        (side * 0.315, -0.500, 1.385),
        (0.078, 0.012, 0.038),
        MAT_CHEEK,
        32,
        16,
    )
    cheek.parent = root

for side in (-1, 1):
    x = side * 0.575

    ear_outer = add_cylinder(
        f"Ear_Outer_{side}",
        (x, 0, 1.49),
        0.145,
        0.09,
        MAT_GOLD,
        rotation=(0, math.radians(90), 0),
    )
    ear_outer.parent = root

    ear_inner = add_cylinder(
        f"Ear_Inner_{side}",
        (x + side * 0.05, 0, 1.49),
        0.092,
        0.055,
        MAT_DARK,
        rotation=(0, math.radians(90), 0),
    )
    ear_inner.parent = root

smile_left = add_uv(
    "Smile_L",
    (-0.055, -0.505, 1.325),
    (0.050, 0.010, 0.012),
    MAT_EYE,
    32,
    16,
)
smile_left.rotation_euler.y = math.radians(-13)
smile_left.parent = root

smile_center = add_uv(
    "Smile_C",
    (0, -0.507, 1.315),
    (0.050, 0.010, 0.012),
    MAT_EYE,
    32,
    16,
)
smile_center.parent = root

smile_right = add_uv(
    "Smile_R",
    (0.055, -0.505, 1.325),
    (0.050, 0.010, 0.012),
    MAT_EYE,
    32,
    16,
)
smile_right.rotation_euler.y = math.radians(13)
smile_right.parent = root

body = add_uv(
    "Torso",
    (0, 0, 0.78),
    (0.36, 0.28, 0.39),
    MAT_BLACK,
)
body.parent = root

chest = add_uv(
    "Chest_Armor",
    (0, -0.24, 0.82),
    (0.30, 0.07, 0.27),
    MAT_DARK,
)
chest.parent = root

core_outer = add_cylinder(
    "Chest_Core_Outer",
    (0, -0.325, 0.84),
    0.105,
    0.045,
    MAT_BLACK,
    rotation=(math.radians(90), 0, 0),
)
core_outer.parent = root

core = add_cylinder(
    "Chest_Core",
    (0, -0.355, 0.84),
    0.075,
    0.026,
    MAT_PURPLE,
    rotation=(math.radians(90), 0, 0),
)
core.parent = root

for side in (-1, 1):
    shoulder = add_uv(
        f"Shoulder_{side}",
        (side * 0.39, 0, 0.88),
        (0.15, 0.15, 0.15),
        MAT_DARK,
        48,
        24,
    )
    shoulder.parent = root

    upper = add_cylinder(
        f"UpperArm_{side}",
        (side * 0.46, 0, 0.66),
        0.11,
        0.32,
        MAT_BLACK,
        rotation=(0, 0, 0),
    )
    upper.parent = root

    hand = add_uv(
        f"Hand_{side}",
        (side * 0.46, -0.01, 0.43),
        (0.13, 0.12, 0.14),
        MAT_DARK,
        48,
        24,
    )
    hand.parent = root

for side in (-1, 1):
    leg = add_cylinder(
        f"Leg_{side}",
        (side * 0.16, 0, 0.34),
        0.115,
        0.36,
        MAT_BLACK,
    )
    leg.parent = root

    boot = add_cube(
        f"Boot_{side}",
        (side * 0.16, -0.045, 0.11),
        (0.14, 0.19, 0.10),
        MAT_DARK,
        bevel=0.06,
    )
    boot.parent = root

neck_ring = add_torus(
    "Neck_Ring",
    (0, 0, 1.06),
    0.31,
    0.035,
    MAT_PURPLE,
)
neck_ring.parent = root

for z, radius in [
    (1.98, 0.038),
    (2.08, 0.026),
]:
    orb = add_uv(
        f"Antenna_{z}",
        (0, 0.02, z),
        (radius, radius, radius),
        MAT_PURPLE,
        32,
        16,
    )
    orb.parent = root

stem = add_cylinder(
    "Antenna_Stem",
    (0, 0.02, 2.02),
    0.012,
    0.13,
    MAT_CYAN,
)
stem.parent = root

bpy.context.scene.unit_settings.system = "METRIC"
bpy.context.scene.unit_settings.scale_length = 1.0

root["character"] = "BOBU Explorer"
root["version"] = "1.0-blockout"
root["target_height_m"] = 2.1
root["brand_reference"] = "BOBU Network Official Brand Board"

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    export_apply=True,
    export_yup=True,
)

print("BOBU_BLEND =", BLEND_PATH)
print("BOBU_GLB =", GLB_PATH)
print("BOBU_OBJECTS =", len(bpy.context.scene.objects))
