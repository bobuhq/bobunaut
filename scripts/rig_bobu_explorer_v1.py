import bpy
import math
from pathlib import Path

ROOT = Path.cwd()
BLEND = ROOT / "public/models/bobu/source/bobu-explorer-v1.blend"
RIGGED_BLEND = ROOT / "public/models/bobu/source/bobu-explorer-v1-rigged.blend"
GLB = ROOT / "public/models/bobu/bobu-explorer-v1.glb"

bpy.ops.wm.open_mainfile(filepath=str(BLEND))

old_armatures = [
    obj for obj in bpy.context.scene.objects
    if obj.type == "ARMATURE"
]
for obj in old_armatures:
    bpy.data.objects.remove(obj, do_unlink=True)

arm_data = bpy.data.armatures.new("BOBU_Explorer_Armature")
arm = bpy.data.objects.new(
    "BOBU_Explorer_Armature",
    arm_data,
)
bpy.context.collection.objects.link(arm)

bpy.context.view_layer.objects.active = arm
arm.select_set(True)

bpy.ops.object.mode_set(mode="EDIT")

def bone(name, head, tail, parent=None):
    b = arm.data.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = arm.data.edit_bones[parent]
    return b

bone(
    "Root",
    (0.0, 0.0, 0.05),
    (0.0, 0.0, 0.48),
)

bone(
    "Torso",
    (0.0, 0.0, 0.48),
    (0.0, 0.0, 1.08),
    "Root",
)

bone(
    "Head",
    (0.0, 0.0, 1.05),
    (0.0, 0.0, 1.92),
    "Torso",
)

bone(
    "Arm_L",
    (-0.34, 0.0, 0.94),
    (-0.46, 0.0, 0.43),
    "Torso",
)

bone(
    "Arm_R",
    (0.34, 0.0, 0.94),
    (0.46, 0.0, 0.43),
    "Torso",
)

bone(
    "Leg_L",
    (-0.16, 0.0, 0.47),
    (-0.16, 0.0, 0.06),
    "Root",
)

bone(
    "Leg_R",
    (0.16, 0.0, 0.47),
    (0.16, 0.0, 0.06),
    "Root",
)

bpy.ops.object.mode_set(mode="POSE")

for pb in arm.pose.bones:
    pb.rotation_mode = "XYZ"

bpy.ops.object.mode_set(mode="OBJECT")

groups = {
    "Head": [
        "Head",
        "Helmet_Shell",
        "Face_Panel",
        "Eye_L",
        "Eye_Highlight_L",
        "Cheek_L",
        "Eye_R",
        "Eye_Highlight_R",
        "Cheek_R",
        "Ear_Outer_-1",
        "Ear_Inner_-1",
        "Ear_Outer_1",
        "Ear_Inner_1",
        "Smile_L",
        "Smile_C",
        "Smile_R",
        "Antenna_1.98",
        "Antenna_2.08",
        "Antenna_Stem",
    ],
    "Torso": [
        "Torso",
        "Chest_Armor",
        "Chest_Core_Outer",
        "Chest_Core",
        "Neck_Ring",
    ],
    "Arm_L": [
        "Shoulder_-1",
        "UpperArm_-1",
        "Hand_-1",
    ],
    "Arm_R": [
        "Shoulder_1",
        "UpperArm_1",
        "Hand_1",
    ],
    "Leg_L": [
        "Leg_-1",
        "Boot_-1",
    ],
    "Leg_R": [
        "Leg_1",
        "Boot_1",
    ],
}

for bone_name, object_names in groups.items():
    for object_name in object_names:
        obj = bpy.data.objects.get(object_name)
        if not obj:
            raise RuntimeError(
                f"Missing BOBU object: {object_name}"
            )

        world = obj.matrix_world.copy()

        obj.parent = arm
        obj.parent_type = "BONE"
        obj.parent_bone = bone_name
        obj.matrix_world = world

root_empty = bpy.data.objects.get("BOBU_Explorer_V1")
if root_empty:
    root_empty.hide_render = True
    root_empty.hide_viewport = True

def clear_pose():
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (0.0, 0.0, 0.0)
        pb.location = (0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)

def key_rotation(bone_name, frame, xyz):
    pb = arm.pose.bones[bone_name]
    pb.rotation_euler = xyz
    pb.keyframe_insert(
        data_path="rotation_euler",
        frame=frame,
        group=bone_name,
    )

def key_location(bone_name, frame, xyz):
    pb = arm.pose.bones[bone_name]
    pb.location = xyz
    pb.keyframe_insert(
        data_path="location",
        frame=frame,
        group=bone_name,
    )

def new_action(name, frame_start, frame_end):
    clear_pose()

    action = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = action

    bpy.context.scene.frame_start = frame_start
    bpy.context.scene.frame_end = frame_end

    return action

idle = new_action("Idle", 1, 60)

for frame in (1, 30, 60):
    bob = 0.0 if frame in (1, 60) else 0.018
    key_location(
        "Root",
        frame,
        (0.0, 0.0, bob),
    )

    head_tilt = (
        0.0
        if frame in (1, 60)
        else math.radians(2.5)
    )

    key_rotation(
        "Head",
        frame,
        (head_tilt, 0.0, 0.0),
    )

    for name in (
        "Arm_L",
        "Arm_R",
        "Leg_L",
        "Leg_R",
        "Torso",
    ):
        key_rotation(
            name,
            frame,
            (0.0, 0.0, 0.0),
        )

walk = new_action("Walk", 1, 32)

walk_frames = [
    (1,  24, -24),
    (9,   0,   0),
    (17, -24,  24),
    (25,  0,   0),
    (32, 24, -24),
]

for frame, left_deg, right_deg in walk_frames:
    left = math.radians(left_deg)
    right = math.radians(right_deg)

    key_rotation(
        "Leg_L",
        frame,
        (left, 0.0, 0.0),
    )

    key_rotation(
        "Leg_R",
        frame,
        (right, 0.0, 0.0),
    )

    key_rotation(
        "Arm_L",
        frame,
        (right * 0.78, 0.0, 0.0),
    )

    key_rotation(
        "Arm_R",
        frame,
        (left * 0.78, 0.0, 0.0),
    )

    key_rotation(
        "Torso",
        frame,
        (
            0.0,
            0.0,
            math.radians(
                2.0 if left_deg > 0 else -2.0
            ),
        ),
    )

    bob = (
        0.025
        if frame in (9, 25)
        else 0.0
    )

    key_location(
        "Root",
        frame,
        (0.0, 0.0, bob),
    )

run = new_action("Run", 1, 24)

run_frames = [
    (1,  38, -38),
    (7,   0,   0),
    (13, -38,  38),
    (19,  0,   0),
    (24, 38, -38),
]

for frame, left_deg, right_deg in run_frames:
    left = math.radians(left_deg)
    right = math.radians(right_deg)

    key_rotation(
        "Leg_L",
        frame,
        (left, 0.0, 0.0),
    )

    key_rotation(
        "Leg_R",
        frame,
        (right, 0.0, 0.0),
    )

    key_rotation(
        "Arm_L",
        frame,
        (right * 0.95, 0.0, 0.0),
    )

    key_rotation(
        "Arm_R",
        frame,
        (left * 0.95, 0.0, 0.0),
    )

    key_rotation(
        "Torso",
        frame,
        (
            math.radians(-5.0),
            0.0,
            0.0,
        ),
    )

    bob = (
        0.045
        if frame in (7, 19)
        else 0.0
    )

    key_location(
        "Root",
        frame,
        (0.0, 0.0, bob),
    )

arm.animation_data.action = None

for action in (idle, walk, run):
    track = arm.animation_data.nla_tracks.new()
    track.name = action.name

    strip = track.strips.new(
        action.name,
        int(action.frame_range[0]),
        action,
    )

    strip.action_frame_start = action.frame_range[0]
    strip.action_frame_end = action.frame_range[1]

bpy.context.scene.render.fps = 30

bpy.ops.wm.save_as_mainfile(
    filepath=str(RIGGED_BLEND)
)

bpy.ops.object.select_all(action="DESELECT")

for obj in bpy.context.scene.objects:
    if obj.type in {"MESH", "ARMATURE"}:
        obj.select_set(True)

bpy.context.view_layer.objects.active = arm

bpy.ops.export_scene.gltf(
    filepath=str(GLB),
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_animations=True,
)

print("===== RIG RESULT =====")
print("ARMATURE =", arm.name)
print(
    "BONES =",
    [b.name for b in arm.data.bones],
)
print(
    "ACTIONS =",
    [a.name for a in bpy.data.actions],
)
print("GLB =", GLB)
print("RIGGED_BLEND =", RIGGED_BLEND)
