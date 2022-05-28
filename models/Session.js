import { Sequelize } from "sequelize";
import db from "../config/database.js";

const tokens = db.define(
  "session",
  {
    sid: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    sess: {
      type: Sequelize.JSON,
    },
    expire: {
      type: Sequelize.DATE,
    },
  },
  {
    // disable the modification of table names; By default, sequelize will automatically
    // transform all passed model names (first parameter of define) into plural.
    // if you don't want that, set the following
    freezeTableName: true,
    //by default sequelize adds createdAt and updatedAt fields but we dont need it for this table
    timestamps: false,
  }
);

export default tokens;
