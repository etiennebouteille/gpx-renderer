import { Sequelize } from 'sequelize';
import db from '../config/database.js';

const blogs = db.define('renders', {
    filename: {
        type:Sequelize.STRING
    },
    title: {
        type:Sequelize.STRING
    },
    eventDate: {
        type:Sequelize.DATE
    },
    defaultTitle: {
        type:Sequelize.BOOLEAN
    },
    renderFinished: {
        type:Sequelize.BOOLEAN
    }}, {
        // disable the modification of table names; By default, sequelize will automatically
        // transform all passed model names (first parameter of define) into plural.
        // if you don't want that, set the following
        freezeTableName: true,
});

export default blogs;

