// db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');  // Create or open the database file

// Create a 'users' table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);
});

// Create a 'bets' table for storing bet details
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_username TEXT NOT NULL,
        opponent_username TEXT NOT NULL,
        description TEXT NOT NULL,
        deadline DATE NOT NULL,
        status TEXT DEFAULT 'pending',  -- 'pending', 'accepted', or 'resolved'
        winner_username TEXT DEFAULT NULL,
        FOREIGN KEY (creator_username) REFERENCES users(username),
        FOREIGN KEY (opponent_username) REFERENCES users(username)
    )`);
});


module.exports = db;  // Export the database connection for use in other files
