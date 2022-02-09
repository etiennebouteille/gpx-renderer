import express from 'express';
import multer from 'multer';
import { gpxFilter }  from '../modules/helpers.js';
import path from 'path';
const router = express.Router();
import { spawn } from 'child_process';
import PQueue from 'p-queue';
import Render from '../models/Renders.js'
import StravaTokens from '../models/StravaTokens.js';
import makeGpx from '../modules/makegpx.js';
import axios from 'axios';
import fs from 'fs';

//Create a queue with a max number of concurent processes of 1
const requestQueue = new PQueue({ concurrency: 1 });

//config for the downloaded files : where they go and what they should be called
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, 'uploads/');
    },

    filename: function(req, file, cb){
        let fileName = file.originalname;
        //remove spaces from filename
        fileName = fileName.replace(/\s/g, '');
        // cb(null, Date.now() + fileName);
        cb(null, fileName);
    }
});

//main function that does the rendering and communicates with the client
function render(filepath, io, renderID) {

    console.log("Beggining a new render");

    return new Promise(function (resolve, reject) {
        //start child process that works blender in the background
        const pyProg = spawn('blender', ["-b", "blender/birdview_basefile.blend", "--python", "python/opengpx.py", "--", filepath, renderID]);

        //transforming the upload filepath to the render filepath
        let imgpath = filepath.slice(8, -4);
        imgpath = "/renders/" + renderID + imgpath + "_render.png"

        pyProg.on('close', (code) => {
            console.log(`child process close all stdio with code ${code}, rendering done`);
            io.sockets.emit('message', "Rendering done !", imgpath);

            Render.update({
                renderFinished:true 
            }, {
                where: {id:renderID}
            })

            resolve(code);
        })

        //piping the python output to the node console
        pyProg.stdout.on('data', function(data){
            console.log(data.toString());
        });

        pyProg.on('error', function (err) {
            reject(err);
        })
    });
};

//call this function to add a render to the queue
async function queueRender(filepath, io, id) {
    console.log(`Queue size: ${requestQueue.size}, Pending: ${requestQueue.pending}`);
    return requestQueue.add(() => render(filepath, io, id));
}

requestQueue.on('completed', (result, renderID) => {
    console.log(`Task finished, tasks left : ${requestQueue.pending}`);    
	console.log(result);
});

//add a new render to the database and queue it to be rendered
async function newRenderEntry(req, io, filename, filepath, title, date){
    //if title is not defined it take filename and removes extension
    var title = (typeof title !== 'undefined') ? title : filename.slice(0, -4);
    var date = (typeof date !== 'undefined') ? date : Date.now();

    const renderID = await Render.create({
        filename:filename,
        title:title,
        eventDate:Date.now(),
        defaultTitle:true,
        renderFinished:false
    })
        .then(render => {
            queueRender(filepath, io, render.id);
            //createdRender is an array of all renders created by the session
            if(req.session.createdRender){
                let createdRenders = req.session.createdRender;
                createdRenders.push(render.id);
            } else {
                let createdRenders = req.session.createdRender = [];
                createdRenders.push(render.id);
            }
            return render.id
        })
        .catch(err => console.log("Article creation error :"  + err))

        return renderID;
}

export default function(io){

    //in case the user reloads the page we dont want them to resend the data so send them back home
    router.get('/', (req, res) => {
        res.redirect('../');
    })

    router.post('/', (req, res, next) => {
        let upload = multer({storage: storage, fileFilter: gpxFilter}).single("gpxfile");
    
        //everything happens in upload loop, if no error is detected then it proceeds
        upload(req, res, function(err){
            if (req.fileValidationError) {
                return res.render('error', {'error': req.fileValidationError});
            }
            else if (!req.file) {
                return res.render('error', {'error': 'No file selected, please pick a gpx file to upload'});
            }
            else if (err instanceof multer.MulterError) {
                return res.send(err);
            }
            else if (err) {
                return res.send(err);
            }
            
            console.log("upload worked fine");

            newRenderEntry(req, io, req.file.originalname, req.file.path)
            .then(renderID => {
            res.redirect(`/renders/${renderID}`)
            })
        })
    }); 
    
    //user redirect here when creating a render from strava API
    //it downloads the activity's stream, converts it to a gpx file and add it to render queue
    router.get("/strava/:id/:name", async (req, res) => {
        const access_token = await StravaTokens.findByPk(req.session.stravaID).then(token=>{return token.access_token});
        const gpxFile = await axios({
            method: 'get',
            url: `https://www.strava.com/api/v3/activities/${req.params.id}/streams`,
            data: {keys: 'latlng,altitude'},
            headers: {
              Authorization: 'Bearer ' + access_token
            }
          }).then((_res) => {
              const latlon = _res.data[0].data;
              const altitude = _res.data[2].data;

              const gpx = makeGpx(req.params.name, latlon, altitude);

              const name = req.params.name + ".gpx"
              const destination = "uploads/"
              const path = destination.concat(name);

              fs.writeFile(path, gpx, (err) => {
                  if (err){
                      console.log(err);
                  } else {
                      console.log("gpx file written successfully at : " + path)
                  }
              })

              const file = {
                  name,
                  path
              }
              return file;
          })
          newRenderEntry(req, io, gpxFile.name, gpxFile.path, req.params.name)
          .then(renderID => {
            res.redirect(`/renders/${renderID}`)
          })
    })

    return router;
};