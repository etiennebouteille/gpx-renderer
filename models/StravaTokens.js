import { Sequelize } from 'sequelize';
import db from '../config/database.js';

const tokens = db.define('strava-tokens', {
    id: {
        type:Sequelize.INTEGER,
        primaryKey:true,
    },
    access_token: {
        type:Sequelize.STRING
    },
    expires_at: {
        type:Sequelize.DATE
    },
    refresh_token: {
        type:Sequelize.STRING
    }}, {
        // disable the modification of table names; By default, sequelize will automatically
        // transform all passed model names (first parameter of define) into plural.
        // if you don't want that, set the following
        freezeTableName: true,
});

export default tokens;

