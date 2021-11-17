#this is used to install the gpx importer addon on blender
#use this in terminal :  blender -b --python-console
import bpy
bpy.ops.preferences.addon_install(filepath="/home/pi/gpx-renderer/BlenderGIS-225.zip")
#bpy.ops.preferences.addon_install(filepath="/home/pi/gpx-renderer/blender-gpx-master.zip")
#bpy.ops.preferences.addon_enable(module="blender-gpx-master")
bpy.ops.preferences.addon_enable(module="BlenderGIS-225")
bpy.ops.wm.save_userpref()
