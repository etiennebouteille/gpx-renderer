#this is used to install the gpx importer addon on blender
import bpy
bpy.ops.wm.addon_install(filepath="/home/pi/fourth-app/blender-gpx-master.zip")
bpy.ops.wm.addon_enable(module="blender-gpx-master")
bpy.ops.wm.save_userpref()
