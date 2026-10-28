// Optional: resets the database to the fresh demo data.
require('./dbinit').init(true).then(() => process.exit()).catch(e => {
  console.log('\nCould not set up MySQL: ' + e.message);
  console.log('Check that MySQL is running and DB_USER / DB_PASS in .env are correct.\n');
  process.exit(1);
});
