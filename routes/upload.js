import express from "express";
import Render from "../models/Renders.js";
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
  console.log("got a uplaod req");

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
    const job = await renderQueue.add({
      renderID: renderID,
      filename: req.body.filename,
    });
    res.send({ renderID });
  } else {
    res.status(500).send("Could not add render to the database");
  }
});

export default router;

// async function newRenderEntry(req, io, filename, filepath, title, date) {
//   //if title is not defined it take filename and removes extension
//   var title = typeof title !== "undefined" ? title : filename.slice(0, -4);

//   const renderID = await Render.create({
//     filename: filename,
//     title: title,
//     eventDate: Date.now(),
//     defaultTitle: true,
//     renderFinished: false,
//   })
//     .then((render) => {
//       queueRender(filepath, io, render.id);
//       //createdRender is an array of all renders created by the session
//       if (req.session.createdRender) {
//         let createdRenders = req.session.createdRender;
//         createdRenders.push(render.id);
//       } else {
//         let createdRenders = (req.session.createdRender = []);
//         createdRenders.push(render.id);
//       }
//       return render.id;
//     })
//     .catch((err) => console.log("Article creation error :" + err));

//   return renderID;
// }
