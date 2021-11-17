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

app.post("/upload", (req, res, next) => {
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

        let imgpath = req.file.path.slice(8, -4);
        imgpath = "/renders/" + imgpath + "_render.png"
        // imgpath = imgpath.concat('.png')

        io.on("connection", (socket) => {
            console.log("User connected to the upload page : " + socket.id);

            pyProg.on('close', (code) => {
                console.log(`child process close all stdio with code ${code}, rendering done`);

                socket.emit('message', "rendering done", imgpath);
            });
        });

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

server.listen(port, ()=> console.log(`App started, listening on port ${port}...`))