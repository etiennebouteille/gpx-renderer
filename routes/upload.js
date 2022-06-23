import express from "express";
import Render from "../models/Renders.js";
import Session from "../models/Session.js";
import Bull from "bull";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const renderQueue = new Bull("gpx-render-queue", {
  limiter: {
    max: 1,
    duration: 5000,
    bounceBack: true, // important
  },
  redis: { password: process.env.REDIS_DB_PASSWORD },
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
    renderFailed: false,
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

router.post("/getSignedUrl", async (req, res) => {
  console.log("req : ", req.body);

  console.log("signing url");

  const region = "fr-par";
  const endpoint = "https://s3.fr-par.scw.cloud";

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secrectAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const signatureVersion = "v4";

  console.log("keys : ", accessKeyId, secrectAccessKey);

  const s3Client = new S3Client({
    region,
    endpoint,
    accessKeyId,
    secrectAccessKey,
    signatureVersion,
  });

  const uuid = uuidv4();
  const filename = `${uuid}_${req.body.filename}`;

  const bucketParams = {
    Bucket: "birdview-gpx",
    Key: filename,
    ContentType: "application/gpx+xml",
  };

  const command = new PutObjectCommand(bucketParams);

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });
    console.log("signed url : ", signedUrl);
    const body = {
      message: "Success",
      url: signedUrl,
      filename: filename,
    };
    res.send(body);
  } catch (err) {
    console.log("url signing error : ", err);

    const body = {
      message: "Failed to get url",
      error: err,
    };
    res.status(500).send(body);
  }
});

export default router;
