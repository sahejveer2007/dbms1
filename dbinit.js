// Creates / repairs the database automatically, so "Unknown database" can never happen.
require('dotenv').config();
const mysql = require('mysql2/promise'), fs = require('fs');
const DB = 'job_internship_portal';
async function init(force) {
  let c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Rohit55biradar', multipleStatements: true });
  let build = !!force;
  try {
    const [d] = await c.query('SHOW DATABASES LIKE ?', [DB]);
    if (!d.length) build = true;
    else {
      // an older version of the database (without the feedback column) is rebuilt
      const [col] = await c.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='applications' AND COLUMN_NAME='feedback'", [DB]);
      if (!col.length) build = true;
    }
    if (build) { await c.query(fs.readFileSync(__dirname + '/schema.sql', 'utf8')); console.log('Database and tables created.'); }
  } finally { await c.end(); }
  if (build) await require('./seed').run();
}
module.exports = { init };
