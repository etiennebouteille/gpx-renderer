const express = require("express");
const main = require('./routes/main');
const fs = require('fs');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const upload = require('./routes/upload')(io);

//register view engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

const port = 5000;

//main routing
app.use('/', main);
app.use('/upload', upload);

app.get('/about', (req, res) => {
    res.render('about')
})

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
