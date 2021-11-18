import sys
import bpy
from xml.etree import ElementTree as ET
import os
import time

print("starting gpx manipulation in blender")

ns = {"gpx": "http://www.topografix.com/GPX/1/1"} 

argv = sys.argv[sys.argv.index("--") + 1:]
tree = ET.parse(argv[0])
root = tree.getroot()

#gpx1.1 hast two main branches : metadata and trk

#get to the metadata in xml file using the namespace prefix, otherwise it doesnt work
metadata = tree.find("{http://www.topografix.com/GPX/1/1}metadata")
#getting the bounds in the metadata, another way to work with the namespace
bounds = metadata.find("gpx:bounds", ns)
#the bound coordinates are in the attributes of the bound, like so :
#<bounds minlat="59.4367664166667" maxlat="59.4440920666666" minlon="24.74394385" maxlon="24.7971432"/>
attribs = bounds.attrib
#convert the bounds from a dictionnary to an array of floats
# boundCoords = [(k, float(v)) for k, v in attribs.iteritems()]

order = {'minlon', 'minlat', 'maxlon', 'maxlat'}

for i in attribs:
    attribs[i] = float(attribs[i])

#make bounds larger so the gpx doesnt touch the borders
#we had the same padding on lat and long, lat are bigger numbers 
# so it's too big if we multiply by the same as long
for i in order:
    if i == 'minlat':
        attribs[i] = attribs[i] - (attribs['minlon'] * 0.001)
    if i == 'minlon':
        attribs[i] = attribs[i] * 0.999
    if i == 'maxlat':
        attribs[i] = attribs[i] + (attribs['maxlon'] * 0.001)
    if i == 'maxlon':
        attribs[i] = attribs[i] * 1.001

bpy.context.scene.blosm.minLon = float(attribs['minlon'])
bpy.context.scene.blosm.minLat = float(attribs['minlat'])
bpy.context.scene.blosm.maxLon = float(attribs['maxlon'])
bpy.context.scene.blosm.maxLat = float(attribs['maxlat'])

#scale the number of vertices to the size of the gpx so we dont import a gigantic number of them and crash
latVertices = int((attribs['maxlat'] - attribs['minlat']) * 3600)
lonVertices = int((attribs['maxlon'] - attribs['minlon']) * 3600)
verts = (latVertices)*(lonVertices)

maxverts = 100000
if verts < maxverts:
    bpy.context.scene.blosm.terrainReductionRatio = '1'
elif verts < (maxverts * 4):
    bpy.context.scene.blosm.terrainReductionRatio = '2'
else:
    bpy.context.scene.blosm.terrainReductionRatio = '5'

#import terrain topography using blender osm addon
bpy.context.scene.blosm.dataType = "terrain"
bpy.context.scene.blosm.ignoreGeoreferencing = True
bpy.ops.blosm.import_data()

print("going to import sat data now")

bpy.context.scene.blosm.dataType = "overlay"
bpy.context.scene.blosm.overlayType = 'mapbox-satellite'
bpy.context.scene.blosm.terrainObject = 'Terrain'
bpy.ops.blosm.import_data()

print("Sleeping")
time.sleep(10)

#scale terrain to mini size (it imports in real life size and i dont like it)
goalSize = 10 #in meters
maxTerrainSize = max(bpy.data.objects['Terrain'].dimensions.x, bpy.data.objects['Terrain'].dimensions.x) 
scaleFactor = goalSize/maxTerrainSize
bpy.ops.transform.resize(value=(scaleFactor, scaleFactor, scaleFactor))

bpy.context.scene.blosm.dataType = "gpx"
bpy.context.scene.blosm.gpxProjectOnTerrain = False
bpy.context.scene.blosm.gpxFilepath = argv[0]
bpy.ops.blosm.import_data()
bpy.ops.transform.resize(value=(scaleFactor, scaleFactor, scaleFactor))

#delete curve extrusion and convert the object to a mesh
bpy.context.object.data.bevel_object = None
bpy.ops.object.convert(target='MESH')

bpy.ops.object.editmode_toggle()

bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":(0, 0, -1.5)})
#aligne tous les points inferieurs sur le meme plan
bpy.ops.transform.resize(value=(1, 1, 0))
#push bottom level below lowest point
bpy.ops.transform.translate(value=(0, 0, 0.1))

bpy.ops.object.editmode_toggle()

# #align with the ground
# bpy.ops.transform.translate(value=(0,0,3))

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

#save file
bpy.ops.wm.save_as_mainfile(filepath="/home/pi/gpx-renderer/blender/blosm-after.blend",copy=True)