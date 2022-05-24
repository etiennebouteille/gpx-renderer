#using blender 2.83
#this is used to install the gpx importer addon on blender
#use this in terminal :  blender -b --python-console
import bpy
# bpy.ops.preferences.addon_install(filepath="/home/pi/blosm-experiment/blosm.zip")
# bpy.ops.preferences.addon_enable(module="blender-osm")
# bpy.ops.wm.save_userpref()

#set blender osm data directory :
bpy.context.preferences.addons["blender-osm"].preferences.dataDir = "/home/pi/birdview/gpx-renderer/blosm-cache"
bpy.ops.wm.save_userpref()
