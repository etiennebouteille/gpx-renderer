import express from "express";
import Render from "../models/Renders.js";
import Session from "../models/Session.js";
import Bull from "bull";

const renderQueue = new Bull("gpx-render-queue", {
  limiter: {
    max: 1,
    duration: 5000,
    bounceBack: true, // important
  },
});

const router = express.Router();

router.post("/", async (req, res) => {
  //create a new entry for the render in the db
  const renderID = await Render.create({
    filename: req.body.filename,
    title: req.body.title,
    eventDate: Date.now(),
    defaultTitle: true,
    renderFinished: false,
  })
    .then((render) => {
      //add to the sessions created renders
      return render.id;
    })
    .catch((err) => console.log("Article creation error :" + err));

  if (renderID) {
    //add render to render queue
    const job = await renderQueue.add({
      renderID: renderID,
      filename: req.body.filename,
    });

    //add the render to the list of renders created by the session
    let sessionDB = await Session.findByPk(req.body.sessionID);
    if (sessionDB) {
      console.log("updating session");
      sessionDB.sess.createdRenders.push(renderID);
      sessionDB.changed("sess", true);
      await sessionDB.save();
    }

    res.send({ renderID });
  } else {
    res.status(500).send("Could not add render to the database");
  }
});

export default router;
