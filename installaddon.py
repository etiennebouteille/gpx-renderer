#using blender 2.83
#this is used to install the gpx importer addon on blender
#use this in terminal :  blender -b --python-console
import bpy
bpy.ops.preferences.addon_install(filepath="/home/pi/blosm-experiment/blosm.zip")
#bpy.ops.preferences.addon_install(filepath="/home/pi/gpx-renderer/BlenderGIS-225.zip")
#bpy.ops.preferences.addon_install(filepath="/home/pi/gpx-renderer/blender-gpx-master.zip")
#bpy.ops.preferences.addon_enable(module="blender-gpx-master")
#bpy.ops.preferences.addon_enable(module="BlenderGIS-225")
bpy.ops.preferences.addon_enable(module="blender-osm")
bpy.ops.wm.save_userpref()

#set blender osm data directory :
bpy.context.preferences.addons["blender-osm"].preferences.dataDir = "/home/pi/gpx-renderer/blosm-cache"
bpy.ops.wm.save_userpref()
