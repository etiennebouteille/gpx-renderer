import express from "express";
import Session from "../models/Session.js";
const router = express.Router();

router.get("/:id", async (req, res) => {
  const session = Session.findByPk(req.params.id)
    .then((sessionData) => {
      res.send(sessionData);
    })
    .catch((err) => {
      res.status(404).send(err);
    });
});

//create a new session session in the dbmatched with a cookie on the client
router.post("/create", async (req, res) => {
  console.log("creating session, expire date : ", req.body.expire);
  Session.create({
    sid: req.body.sid,
    sess: { createdRenders: [] },
    expire: req.body.expire,
  })
    .then(res.sendStatus(200))
    .catch((err) => res.status(404).send(err));
});

//update the session to add a new attributed renderID
router.post("/addRenderId", async (req, res) => {
  console.log("session/addRenderId called");
  let sessionDB = await Session.findByPk(req.body.sid);
  sessionDB.sess.createdRenders.push(req.body.renderID);
  sessionDB.changed("sess", true);
  await sessionDB.save();
  res.sendStatus(200);
});

export default router;
