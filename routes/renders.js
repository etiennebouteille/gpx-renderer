import express from "express";
import Render from "../models/Renders.js";
const router = express.Router();

router.get("/:id", async (req, res) => {
  await Render.findByPk(req.params.id)
    .then((render) => {
      if (render == null) {
        res.redirect("/");
      } else if (req.session.createdRender.indexOf(render.id) >= 0) {
        //check if render id has been created by this session
        res.render("render_editable", { render });
      } else {
        res.render("render", { render });
      }
    })
    .catch((err) => {
      res.end();
    });
});

router.get("/api/:id", async (req, res) => {
  await Render.findByPk(req.params.id)
    .then((render) => {
      if (render == null) {
        res.redirect("/");
      } else {
        let response = { render };
        res.send(response);
      }
    })
    .catch((err) => {
      res.end();
    });
});

//new version of the call to edit the title of a render
router.put("/edittitle/:id", async (req, res) => {
  console.log("received title update request : ", req.body.title);
  await Render.upsert({
    id: req.params.id,
    title: req.body.title,
    defaultTitle: false,
  }).then(res.sendStatus(200));
});

router.post("/:id", async (req, res) => {
  await Render.upsert({
    id: req.params.id,
    title: req.body.title,
    defaultTitle: false,
  }).then(([instance, created]) => {
    res.render("render_editable", { render: instance });
  });
});

export default router;
