import express from 'express';
import multer from 'multer';
import { gpxFilter }  from '../modules/helpers.js';
import path from 'path';
const router = express.Router();
import { spawn } from 'child_process';

//config for the downloaded files : where they go and what they should be called
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, 'uploads/');
    },

    filename: function(req, file, cb){
        cb(null, Date.now() + file.originalname);
    }
});

export default function(io){

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
    
            console.log("Now to begin with the queuing...");
    
            //start child process that works blender in the background
            // const { spawn }  = import('child_process');
            // import spawn from 'child_process';
            const pyProg = spawn('blender', ["-b", "blender/birdview_basefile.blend", "--python", "python/opengpx.py", "--", req.file.path]);
    
            //transforming the upload filepath to the render filepath
            let imgpath = req.file.path.slice(8, -4);
            imgpath = "/renders/" + imgpath + "_render.png"
    
            io.on("connection", (socket) => {
                console.log("User connected to the upload page : " + socket.id);
    
                pyProg.on('close', (code) => {
                    console.log(`child process close all stdio with code ${code}, rendering done`);
    
                    socket.emit('message', "Rendering done !", imgpath);
                });
            });
    
            //piping the python output to the node console
            pyProg.stdout.on('data', function(data){
                console.log(data.toString());
            });
            res.render('upload', {'filepath': req.file.path});
        })
    });

    return router;
};