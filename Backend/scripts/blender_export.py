
import bpy
import sys
import json
import os

def export_to_glb(input_path, output_path):
    # Clear existing scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    try:
        # Import the blend file
        with bpy.data.libraries.load(input_path, link=False) as (data_from, data_to):
            data_to.objects = data_from.objects
            data_to.meshes = data_from.meshes
            data_to.materials = data_from.materials
        
        # Link objects to scene
        scene = bpy.context.scene
        for obj in data_to.objects:
            if obj is not None:
                scene.collection.objects.link(obj)
        
        # Select all mesh objects
        bpy.ops.object.select_all(action='DESELECT')
        mesh_count = 0
        for obj in scene.objects:
            if obj.type == 'MESH':
                obj.select_set(True)
                mesh_count += 1
        
        if mesh_count == 0:
            # Try alternative import method
            bpy.ops.wm.open_mainfile(filepath=input_path)
            for obj in bpy.context.scene.objects:
                if obj.type == 'MESH':
                    obj.select_set(True)
                    mesh_count += 1
        
        if mesh_count == 0:
            print(json.dumps({"error": "No mesh objects found in file"}))
            sys.exit(1)
        
        # Apply transformations
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        
        # Export to GLB
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=False,
            export_apply=True,
            export_materials='EXPORT',
            export_colors=True,
            export_normals=True,
            export_tangents=False,
            export_yup=True
        )
        
        # Get statistics
        stats = {
            "success": True,
            "meshCount": mesh_count,
            "outputPath": output_path,
            "fileSize": os.path.getsize(output_path)
        }
        print("EXPORT_RESULT:" + json.dumps(stats))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: blender --python script.py -- input.blend output.glb"}))
        sys.exit(1)
    
    # Arguments after "--"
    args = sys.argv[sys.argv.index("--") + 1:]
    input_file = args[0]
    output_file = args[1]
    
    export_to_glb(input_file, output_file)
