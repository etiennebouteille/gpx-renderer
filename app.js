const express = require("express");
const multer = require("multer");
const path = require("path");
const helpers = require("./modules/helpers");

const app = express();

const port = 5000;

app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, 'uploads/');
    },

    filename: function(req, file, cb){
        cb(null, Date.now() + file.originalname);
    }
});

app.post("/upload", (req, res) => {
    let upload = multer({storage: storage, fileFilter: helpers.gpxFilter}).single("gpxfile");

    upload(req, res, function(err){
        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        }
        else if (!req.file) {
            return res.send('No file selected, please pick a gpx file to upload');
        }
        else if (err instanceof multer.MulterError) {
            return res.send(err);
        }
        else if (err) {
            return res.send(err);
        }
        
        console.log("upload worked fine");

        const { spawn }  = require('child_process');
        const pyProg = spawn('blender', ["-b", "blender/gpx_basefile_283.blend", "--python", "python/opengpx.py", "--", req.file.path]);

        res.send(`<p>File uploaded and processing! filepath : ${req.file.path}</p>`);
    })

    // pyProg.stdout.on('data', function(data){
    //     //console.log("Piping data from python");
    //     //pythonData = data.toString();
    //     console.log(data.toString());
    // });

    // pyProg.on('close', (code) => {
    //     console.log(`child process close all stdio with code ${code}`);
    //     // send data to browser
    //     //res.send(`<p>File uploaded! Here is the outcome : ${pythonData}</p>`)
    // });

})

app.listen(port, ()=> console.log(`App started, listening on port ${port}...`))