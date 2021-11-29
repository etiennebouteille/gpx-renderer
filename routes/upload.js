const express = require("express");
const router = express.Router();
const multer = require("multer");
const helpers = require("../modules/helpers");
const path = require("path");

//config for the downloaded files : where they go and what they should be called
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, 'uploads/');
    },

    filename: function(req, file, cb){
        cb(null, Date.now() + file.originalname);
    }
});

//POST request triggered when the upload button is clicked
router.post('/', (req, res, next) => {
    let upload = multer({storage: storage, fileFilter: helpers.gpxFilter}).single("gpxfile");

    //everything happens in upload loop, if no error is detected then in proceeds
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

        //start child process that works blender in the background
        const { spawn }  = require('child_process');
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
            //pythonData = data.toString();
            console.log(data.toString());
        });

        res.render('upload', {'filepath': req.file.path});
    })

});

module.exports = router;
