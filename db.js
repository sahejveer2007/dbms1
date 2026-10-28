require('dotenv').config();
const mysql = require('mysql2/promise');
module.exports = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Rohit55biradar',
  database: 'job_internship_portal',
  dateStrings: true
});
