import express from "express";
import Session from "../models/Session.js";
const router = express.Router();

router.post("/create", async (req, res) => {
  console.log("session/create called");
  await Session.upsert({
    sid: req.body.sid,
    sess: {},
    expires: req.body.expires,
  }).then(res.status(200));
  // await Render.upsert({
  //   id: req.params.id,
  //   title: req.body.title,
  //   defaultTitle: false,
  // }).then(([instance, created]) => {
  //   res.render("render_editable", { render: instance });
  // });
});

router.post("/addRenderId", async (req, res) => {
  console.log("session/addRenderId called");
  await Session.upsert({
    sid: req.body.sid,
    sess: { renderID: req.body.renderID },
  }).then(res.status(200));
});

export default router;
