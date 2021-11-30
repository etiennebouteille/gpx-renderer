import express from 'express';
import multer from 'multer';
import { gpxFilter }  from '../modules/helpers.js';
import path from 'path';
const router = express.Router();
import { spawn } from 'child_process';
import PQueue from 'p-queue';

//Create a queue with a max number of concurent processes of 1
const requestQueue = new PQueue({ concurrency: 1 });

//config for the downloaded files : where they go and what they should be called
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, 'uploads/');
    },

    filename: function(req, file, cb){
        cb(null, Date.now() + file.originalname);
    }
});

//main function that does the rendering and communicates with the client
function render(req, io) {

    console.log("Beggining a new render");

    return new Promise(function (resolve, reject) {
        //start child process that works blender in the background
        const pyProg = spawn('blender', ["-b", "blender/birdview_basefile.blend", "--python", "python/opengpx.py", "--", req.file.path]);

        //transforming the upload filepath to the render filepath
        let imgpath = req.file.path.slice(8, -4);
        imgpath = "/renders/" + imgpath + "_render.png"

        io.on("connection", (socket) => {
            console.log("User connected to the upload page : " + socket.id);

            pyProg.on('close', (code) => {
                console.log(`child process close all stdio with code ${code}, rendering done`);
                console.log("Sending image to socket : " + socket.id);
                socket.to(socket.id).emit('message', "Rendering done !", imgpath);
                resolve(code)
            });
        });

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
async function queueRender(req, io) {
    console.log(`Queue size: ${requestQueue.size}, Pending: ${requestQueue.pending}`);
    return requestQueue.add(() => render(req, io));
}

requestQueue.on('completed', result => {
    console.log(`Task finished, tasks left : ${requestQueue.pending}`);
	console.log(result);
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
            //adding the new file to the render queue
            queueRender(req, io);

            res.render('upload', {'filepath': req.file.path});
        })
    });

    return router;
};