import sys
import bpy
from xml.etree import ElementTree as ET
import os
import time
import math
import random
import gpxpy
import gpxpy.gpx

print("starting gpx manipulation in blender")

random.seed()

argv = sys.argv[sys.argv.index("--") + 1:]

colorpalette = [0xD6F6DD, 0xDAC4F7, 0xF4989C, 0xEBD2B4, 0xACECF7]

def hex_to_rgb( hex_value ):
    b = (hex_value & 0xFF) / 255.0
    g = ((hex_value >> 8) & 0xFF) / 255.0
    r = ((hex_value >> 16) & 0xFF) / 255.0
    a = 1
    return r, g, b, a

#Functions to approximate the conversion from latitude & longitude (degrees) to kilometers
#https://stackoverflow.com/questions/1253499/simple-calculations-for-working-with-lat-lon-and-km-distance
def latToKm(lat):
    km = lat * 110.574
    return km

def lonToKm(lon, lat):
    radLat = math.radians(lat)
    km = lon * (111.320*math.cos(radLat))
    return km

def kmToLat(km):
    deg = km / 110.574
    return deg

def kmToLon(km, lat):
    radLat = math.radians(lat)
    deg = km / (111.320*math.cos(radLat))
    return deg

###--- PARSING GPX FILE ---###

gpx_file = open(argv[0])
gpx = gpxpy.parse(gpx_file)
bounds = gpx.get_bounds()

bounds = {'minlat' : bounds.min_latitude, 'maxlat' : bounds.max_latitude, 'minlon' : bounds.min_longitude, 'maxlon' : bounds.max_longitude}


###--- PROCESSING COORDONATES TO DFINE TERRAIN BOUNDARIES ---###

for k, v in bounds.items():
    if k == 'minlat':
        bounds[k] = v - (bounds['minlon'] * 0.001)
    if k == 'minlon':
        bounds[k] = v * 0.999
    if k == 'maxlat':
        bounds[k] = v + (bounds['maxlon'] * 0.001)
    if k == 'maxlon':
        bounds[k] = v * 1.001

#make the terrain a square
# we need to go from degrees to km because 1 deg of lat and 1 deg of lon
#are not equal and change according to where you are on the plant
#fun fact : 1 deg on longitude equals 111km at the equator but only 77km in France!
avrgLat = (bounds['maxlat'] + bounds['minlat']) / 2
latSize = latToKm(bounds['maxlat'] - bounds['minlat'])
lonSize = lonToKm(bounds['maxlon'] - bounds['minlon'], avrgLat)
maxSize = max(latSize, lonSize)

if maxSize == latSize:
    d = latSize - lonSize
    bounds['minlon'] = bounds['minlon'] - kmToLon(d/2, avrgLat)
    bounds['maxlon'] = bounds['maxlon'] + kmToLon(d/2, avrgLat)
elif maxSize == lonSize:
    d = lonSize - latSize
    bounds['minlat'] = bounds['minlat'] - kmToLat(d/2)
    bounds['maxlat'] = bounds['maxlat'] + kmToLat(d/2)

totalSurface = latToKm(bounds['maxlat']-bounds['minlat']) * lonToKm(bounds['maxlon']-bounds['minlon'], avrgLat)
print("Total surface (km2) : " + str(totalSurface))

#send coordinates to blender osm addon
bpy.context.scene.blosm.minLon = bounds['minlon']
bpy.context.scene.blosm.minLat = bounds['minlat']
bpy.context.scene.blosm.maxLon = bounds['maxlon']
bpy.context.scene.blosm.maxLat = bounds['maxlat']


###--- IMPORTING GEO DATA TO BLENDER---###

#scale the number of vertices to the size of the gpx so we dont import a gigantic number of them and crash
latVertices = int((bounds['maxlat'] - bounds['minlat']) * 3600)
lonVertices = int((bounds['maxlon'] - bounds['minlon']) * 3600)
verts = (latVertices)*(lonVertices)

#TODO return error if the file is too big
maxverts = 100000
if verts < maxverts:
    bpy.context.scene.blosm.terrainReductionRatio = '1'
elif verts < (maxverts * 4):
    bpy.context.scene.blosm.terrainReductionRatio = '2'
elif verts < (maxverts * 25):
    bpy.context.scene.blosm.terrainReductionRatio = '5'
else : 
    sys.exit("The area is too big and cannot be rendered")

#cli mode is necessary to import sattelite :
#https://github.com/vvoovv/blender-osm/issues/234
bpy.context.scene.blosm.commandLineMode = True

#import terrain topography using blender osm addon
bpy.context.scene.blosm.dataType = "terrain"
bpy.context.scene.blosm.ignoreGeoreferencing = True
bpy.ops.blosm.import_data()

print("going to import sat data now")

bpy.context.scene.blosm.dataType = "overlay"
bpy.context.scene.blosm.overlayType = 'arcgis-satellite'
bpy.context.scene.blosm.terrainObject = 'Terrain'
bpy.ops.blosm.import_data()

###--- EDITING TERRAIN AND GPX MESH TO LOOK NICE ---###

#scale terrain to mini size (it imports in real life size and i dont like it)
goalSize = 10 #in meters
terrainSize = max(bpy.data.objects['Terrain'].dimensions.x, bpy.data.objects['Terrain'].dimensions.y)
scaleFactor = goalSize/terrainSize
bpy.ops.transform.resize(value=(scaleFactor, scaleFactor, scaleFactor))

#extrudes all the vertices, scale them to 0 on z acis and move the to the bottom
bpy.ops.object.mode_set(mode = 'EDIT')
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":(0, 0, 0)})
bpy.ops.transform.resize(value=(1,1,0))
bpy.ops.object.mode_set(mode = 'OBJECT')
terrainObj = bpy.context.active_object
selectedVerts = [v for v in terrainObj.data.vertices if v.select]
for v in selectedVerts:
    v.co.z = -150


bpy.ops.object.mode_set(mode = 'EDIT')

#assign material to the sides
bpy.ops.mesh.select_more()
sidemat = bpy.data.materials["sidemat"]
bpy.data.objects["Terrain"].data.materials.append(sidemat)
bpy.context.active_object.active_material_index = 1
bpy.ops.object.material_slot_assign()

#fix the normals so the sides dont look wonky
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode = 'OBJECT')
bpy.context.object.data.use_auto_smooth = True

#Import GPX and resize
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
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":(0, 0, 0)})
bpy.ops.transform.resize(value=(1,1,0))
bpy.ops.object.mode_set(mode = 'OBJECT')
gpxObj = bpy.context.active_object
selectedVerts = [v for v in gpxObj.data.vertices if v.select]
for v in selectedVerts:
    v.co.z = -150

#raise from the ground a little in case it clips
bpy.ops.transform.translate(value=(0,0,0.1))

#add thickness to the trace
bpy.ops.object.modifier_add(type='SOLIDIFY')
bpy.context.object.modifiers["Solidify"].thickness = 3.03
bpy.context.object.modifiers["Solidify"].offset = 0

#set bg color
paletteIndex = random.randrange(5)
hexcolor = hex_to_rgb(colorpalette[paletteIndex])
bpy.data.scenes["Scene"].node_tree.nodes["Alpha Over"].inputs[1].default_value = hexcolor

###--- RENDERING ---###

print("ready to render")
rnd = bpy.data.scenes['Scene'].render
rnd.resolution_x = 1000
rnd.resolution_y = 1000
rnd.resolution_percentage = 100
bpy.context.scene.cycles.samples = 50
bpy.context.scene.render.tile_x = 128
bpy.context.scene.render.tile_y = 128

#get gpx file name and remove "uploads/" and ".gpx" to make a nice output name
renderpath = '/home/pi/gpx-renderer/public/renders/' + argv[0][8:-4] + '_render.png'
rnd.filepath = renderpath
bpy.ops.render.render(write_still=True)

print("Rendering done ! The file is here : " + renderpath)

#save file, useful to debug what happened with the script
bpy.ops.wm.save_as_mainfile(filepath="/home/pi/gpx-renderer/blender/blosm-after.blend",copy=True)
