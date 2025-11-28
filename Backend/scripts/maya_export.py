
import maya.standalone
maya.standalone.initialize()

import maya.cmds as cmds
import maya.mel as mel
import sys
import json
import os

def export_to_obj(input_path, output_path):
    try:
        # Open file
        cmds.file(input_path, open=True, force=True)
        
        # Get all mesh objects
        meshes = cmds.ls(type='mesh')
        
        if not meshes:
            print(json.dumps({"error": "No mesh objects found in file"}))
            sys.exit(1)
        
        # Select all meshes
        transforms = []
        for mesh in meshes:
            parent = cmds.listRelatives(mesh, parent=True)
            if parent:
                transforms.extend(parent)
        
        if transforms:
            cmds.select(transforms)
        
        # Export to OBJ
        cmds.file(
            output_path,
            exportSelected=True,
            type="OBJexport",
            force=True,
            options="groups=1;ptgroups=1;materials=1;smoothing=1;normals=1"
        )
        
        stats = {
            "success": True,
            "meshCount": len(meshes),
            "outputPath": output_path,
            "fileSize": os.path.getsize(output_path) if os.path.exists(output_path) else 0
        }
        print("EXPORT_RESULT:" + json.dumps(stats))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    finally:
        maya.standalone.uninitialize()

if __name__ == "__main__":
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    export_to_obj(input_file, output_file)
