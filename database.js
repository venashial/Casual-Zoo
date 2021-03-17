const sqlite3 = require("sqlite3").verbose();

const DBSOURCE = "db.sqlite";

const db = {}

db.animal = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log("Connected to the SQLite database.");
    db.animal.run(
      `CREATE TABLE animal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name text, 
            url text, 
			      emoji text,
			      found integer
            )`,
      (err) => {
        if (err) {
          // Table already created
        } else {
          // Table just created, creating some rows
          console.log("Inserted to new table");
        }
      }
    );
  }
});

db.user = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log("Connected to the SQLite database.");
    db.animal.run(
      `CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id text,
            username text,
            found text
            )`,
      (err) => {
        if (err) {
          // Table already created
        } else {
          // Table just created, creating some rows
        }
      }
    );
  }
});

module.exports = db;

/*
const new_animals = [
  ['monkey', '', ''],
]

new_animals.forEach(animal => {
  const url = (animal[1]) ? animal[1] : animal[0] + ",animal"
  const emoji = (animal[2]) ? animal[2] : animal[0]
  var insert =
  "INSERT INTO animal (name, url, emoji, found) VALUES (?,?,?,?)";
  db.user.run(insert, [animal[0], url, emoji, 0]);
})
*/