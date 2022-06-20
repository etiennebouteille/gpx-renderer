import "dotenv/config";
import express from "express";
import session from "express-session";
import fs from "fs";
const app = express();
import { createServer } from "http";
import { Server } from "socket.io";
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

import Session from "./models/Session.js";
import { Op } from "sequelize";
import cron from "node-cron";

import mainRouter from "./routes/main.js";
import uploadRouter from "./routes/upload.js";
import rendersRouter from "./routes/renders.js";
import stravaRouter from "./routes/strava.js";
import sessionRouter from "./routes/session.js";

import db from "./config/database.js";
import Render from "./models/Renders.js";

import pg from "pg";
import connectPg from "connect-pg-simple";
const pgSession = connectPg(session);

import cors from "cors";

import Bull from "bull";

//settings for cookies db
const pgPool = new pg.Pool({
  user: process.env.DBUSER,
  host: "localhost",
  database: "birdview",
  password: process.env.DBPASSWORD,
  port: 5432,
});

//cookies settings
const sessionMiddleware = session({
  store: new pgSession({
    pool: pgPool,
  }),
  secret: process.env.SESSIONSECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30, //1 mois
    secure: false,
    httpOnly: true,
  },
});

//register view engine
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(sessionMiddleware);
app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const port = 5000;

//main routing
app.use("/", mainRouter);
app.use("/renders", rendersRouter);
app.use("/upload", uploadRouter);
app.use("/strava", stravaRouter);
app.use("/session", sessionRouter);

io.on("connection", (socket) => {
  console.log("User connected to the server : " + socket.id);
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/preview", (req, res) => {
  res.render("render", { title: "tour des aravis", date: Date.now() });
});

app.get("/latest", async (req, res) => {
  const render = await Render.findAll({
    limit: 10,
    order: [["id", "DESC"]],
    where: { renderFinished: true },
  });
  res.render("latest", { render });
});

app.get("/api/latest", async (req, res) => {
  const render = await Render.findAll({
    limit: 10,
    order: [["id", "DESC"]],
    where: { renderFinished: true },
  });
  res.send({ render });
});

//testing bull queue
const renderQueue = new Bull("gpx-render-queue", {
  limiter: {
    max: 1,
    duration: 5000,
    bounceBack: true, // important
  },
});

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

app.get("/bull", async (req, res) => {
  const rID = getRandomInt(1, 200);
  console.log("adding job to list with rID : ", rID);
  const job = await renderQueue.add({
    renderID: rID,
    isRender: false,
  });

  res.send("Job added");
});
app.get("/bullrender", async (req, res) => {
  const rID = getRandomInt(1, 200);
  console.log("adding job to list with rID : ", rID);
  const job = await renderQueue.add({
    renderID: rID,
    isRender: true,
    filename: "Velo_tanninge_max.gpx",
  });

  res.send("Job added");
});

app.get("/getgpx/:id", async (req, res) => {
  console.log("got a request for fil : ", req.params.id);
  const file = `./uploads/${req.params.id}`;
  res.download(file); // Set disposition and send it.
});

app.get("/counts", async (req, res) => {
  const counts = await renderQueue.getJobCounts();
  console.log(counts);

  res.send(counts);
});

renderQueue.on("global:completed", (jobId, result) => {
  console.log(`Job ${jobId} completed with result : ${result}`);
  const res = JSON.parse(result);
  if (res.status == 123) {
    console.log("render completed successfully");
    io.sockets.emit("success", res.filename, res.renderID);
  } else {
    console.log("there was an error with the render");
    //TODO : emettre et traiter message d'erreur
  }
});

renderQueue.on("drained", () => {
  console.log(`No more jobs in the queue`);
});

app.get("*", function (req, res) {
  res.render("error", { error: "This page does not exist" });
});

server.listen(port, () =>
  console.log(`App started, listening on port ${port}...`)
);

//delete expired cookies from db every 5 minutes
cron.schedule("*/20 * * * *", () => {
  const now = new Date();
  Session.destroy({
    where: {
      expire: {
        [Op.lte]: now,
      },
    },
  });
});
