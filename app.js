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

import cors from "cors";

import Bull from "bull";
import PowerManager from "./modules/powerManager.js";

//register view engine
app.set("view engine", "ejs");
app.use(express.static("public"));
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
    where: { renderFinished: true, renderFailed: false },
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
  redis: { password: process.env.REDIS_DB_PASSWORD },
});

const RenderNodePower = new PowerManager(30000);

renderQueue.on("global:completed", (jobId, result) => {
  console.log(`Job ${jobId} completed with result : ${result}`);
  const res = JSON.parse(result);
  if (res.status == 123) {
    console.log("render completed successfully");
    io.sockets.emit("success", res.filename, res.renderID);

    Render.update(
      {
        renderFinished: true,
      },
      {
        where: { id: res.renderID },
      }
    );
  } else {
    console.log("there was an error with the render");
    Render.update(
      {
        renderFinished: true,
        renderFailed: true,
      },
      {
        where: { id: res.renderID },
      }
    );
    io.sockets.emit("fail", res.renderID);
  }
});

//event triggered when the job queue is empty
renderQueue.on("global:drained", () => {
  console.log(`No more jobs in the queue`);
  const shutdownDelay = 1000 * 60 * 2; //2 minutes en ms
  RenderNodePower.delayedPowerOff(shutdownDelay);
});

renderQueue.on("global:waiting", async function (jobId) {
  RenderNodePower.cancelPowerOff();
  //check if the instance is already running
  const isOn = await RenderNodePower.isPowerOn();
  if (!isOn) {
    //turn on the instance
    console.log("going to turn on the instance");
    const pw = await RenderNodePower.poweron();
    console.log("res : ", pw.data);
  }
  console.log("a job is waiting to be processed");
});

app.get("/count", async (req, res) => {
  const c = await renderQueue.getJobCounts();
  // const c = await renderQueue.empty();
  res.send(c);
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
