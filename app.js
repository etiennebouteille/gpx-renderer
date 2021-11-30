import express from 'express';
import fs from 'fs';
const app = express();
import { createServer } from "http";
import { Server } from "socket.io";
const server = createServer(app);
const io = new Server(server);

import mainRouter from './routes/main.js';
import uploadRouter from './routes/upload.js';


//register view engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

const port = 5000;

//main routing
app.use('/', mainRouter);
app.use('/upload', uploadRouter(io));

io.on('connection', (socket) => {
    console.log("User connected to the server : " + socket.id);
});

app.get('/about', (req, res) => {
    res.render('about')
});

app.get('/socket', (req, res) => {
    session = req.session;
    res.send('uh');
});

app.get('/preview', (req, res) => {
    res.render('error', {'error' : 'goo goo gaa gaa'})
});

app.get('/latest', (req, res) => {
    let files = fs.readdirSync("./public/renders/");
    res.render('latest', {'renders': files});
});

app.get('*', function(req, res){
    res.render('error', {'error': 'This page does not exist'});
});

server.listen(port, ()=> console.log(`App started, listening on port ${port}...`))
