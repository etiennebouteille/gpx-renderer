import express from 'express';
import session from 'express-session';
import fs from 'fs';
const app = express();
import { createServer } from "http";
import { Server } from "socket.io";
const server = createServer(app);
const io = new Server(server);

import mainRouter from './routes/main.js';
import uploadRouter from './routes/upload.js';

import db from './config/database.js';
import Render from './models/Renders.js'

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

app.get('/preview', (req, res) => {
    res.render('render', {'title':'tour des aravis', 'date':Date.now()})
});

app.get('/latest', (req, res) => {
    let files = fs.readdirSync("./public/renders/");
    res.render('latest', {'renders': files});
});

app.get('/renders/:id', async (req, res) => {
    const render = await Render.findByPk(req.params.id);
    if(render == null){
        res.redirect('/');
    }
    res.render('render', {render})
})

app.get('*', function(req, res){
    res.render('error', {'error': 'This page does not exist'});
});



server.listen(port, ()=> console.log(`App started, listening on port ${port}...`))
