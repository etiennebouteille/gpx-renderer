import 'dotenv/config'
import { Sequelize } from 'sequelize';

const dbinfo = new Sequelize('birdview', process.env.DBUSER, process.env.DBPASSWORD, {
    host: 'localhost',
    dialect: 'postgres'
});

export default dbinfo;