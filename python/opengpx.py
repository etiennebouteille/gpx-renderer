import sys
import bpy
print("starting gpx manipulation in blender")
argv = sys.argv
argv = argv[argv.index("--") + 1:]
gpxpath = "/home/pi/gpx-renderer/" + argv[0]
print("Gpx path : " + gpxpath)
#import gpx file using blender-gpx addon
bpy.ops.import_scene.gpx(filepath=gpxpath)

#resize to reasonnable size
bpy.ops.transform.resize(value=(0.002, 0.002, 0.002))

#center object on world origin
bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME', center='MEDIAN')
bpy.context.object.location = (0, 0, 0)

#delete curve extrusion and convert the object to a mesh
bpy.context.object.data.bevel_object = None
bpy.ops.object.convert(target='MESH')

bpy.ops.object.editmode_toggle()

bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":(0, 0, -5)})
#aligne tous les points inferieurs sur le meme plan
bpy.ops.transform.resize(value=(1, 1, 0))
#push bottom level below lowest point
bpy.ops.transform.translate(value=(0, 0, 0.1))

bpy.ops.object.editmode_toggle()

#align with the ground
bpy.ops.transform.translate(value=(0,0,3))

bpy.ops.object.modifier_add(type='SOLIDIFY')
bpy.context.object.modifiers["Solidify"].thickness = 3.03
bpy.context.object.modifiers["Solidify"].offset = 0


print("ready to render")
#rendering
rnd = bpy.data.scenes['Scene'].render
rnd.resolution_x = 540
rnd.resolution_y = 540
rnd.resolution_percentage = 100
bpy.context.scene.cycles.samples = 100

#get gpx file name and remove "uploads/" and ".gpx" to make a nice output name
renderpath = '/home/pi/gpx-renderer/public/renders/' + argv[0][8:-4] + '_render.png'
rnd.filepath = renderpath
bpy.ops.render.render(write_still=True)

print("Rendering done ! The file is here : " + renderpath)


