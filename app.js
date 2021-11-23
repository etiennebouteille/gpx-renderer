const express = require("express");
const multer = require("multer");
const path = require("path");
const helpers = require("./modules/helpers");
const main = require('./routes/main');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

//register view engine
app.set('view engine', 'ejs');

const port = 5000;

//main routing
app.use('/', main);
app.use(express.static('public'));

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
app.post("/upload", (req, res, next) => {
    let upload = multer({storage: storage, fileFilter: helpers.gpxFilter}).single("gpxfile");

    //everything happens in upload loop, if no error is detected then in proceeds
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

        //start child process that works blender in the background
        const { spawn }  = require('child_process');
        const pyProg = spawn('blender', ["-b", "blender/blosm-exp-basefile4.blend", "--python", "python/opengpx.py", "--", req.file.path]);

        //transforming the upload filepath to the render filepath
        let imgpath = req.file.path.slice(8, -4);
        imgpath = "/renders/" + imgpath + "_render.png"

        io.on("connection", (socket) => {
            console.log("User connected to the upload page : " + socket.id);

            pyProg.on('close', (code) => {
                console.log(`child process close all stdio with code ${code}, rendering done`);

                socket.emit('message', "rendering done", imgpath);
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

app.get('/a', (req, res) => {

    res.send("<p>Not much to see here!</p>");
});

app.get('/preview', (req, res) => {
    res.render('index')
});

server.listen(port, ()=> console.log(`App started, listening on port ${port}...`))
