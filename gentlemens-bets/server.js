const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = 3000;
const db = require('./db');  // Import the database connection

// Session setup
app.use(session({
    secret: 'your-secret-key', // This can be any random string
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }  // Make sure it's set to false for development (set to true if using HTTPS)
}));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-memory user storage (for simplicity)
let users = [];  // This will store users as { username: '...', password: '...' }

// Routes
app.get('/', (req, res) => res.render('index'));  // Home page
app.get('/login', (req, res) => res.render('login'));  // Login page
app.get('/register', (req, res) => res.render('register'));  // Registration page
app.get('/dashboard', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    // Query to get bets involving the logged-in user
    const query = `
    SELECT * FROM bets 
    WHERE creator_username = ? OR opponent_username = ?
    `;
    db.all(query, [req.session.username, req.session.username], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error loading bets.');
        }

        // Display bets in HTML
        const betsHtml = rows.map(bet => `
            <div>
                <p><strong>Description:</strong> ${bet.description}</p>
                <p><strong>Opponent:</strong> ${bet.opponent_username}</p>
                <p><strong>Deadline:</strong> ${bet.deadline}</p>
                <p><strong>Status:</strong> ${bet.status}</p>
            </div>
        `).join('');

        res.send(`
            <h1>Welcome, ${req.session.username}</h1>
            <h2>Your Bets:</h2>
            ${betsHtml}
            <a href="/create-bet">Create New Bet</a>
            <a href="/logout">Logout</a>
        `);
    });
});

// Route to display the bet creation form
app.get('/create-bet', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    res.send(`
        <form action="/create-bet" method="POST">
            <label for="opponent">Opponent Username:</label>
            <input type="text" id="opponent" name="opponent" required />

            <label for="description">Bet Description:</label>
            <textarea id="description" name="description" required></textarea>

            <label for="deadline">Deadline (YYYY-MM-DD):</label>
            <input type="date" id="deadline" name="deadline" required />

            <button type="submit">Create Bet</button>
        </form>
    `);
});

// Route to handle bet creation
app.post('/create-bet', (req, res) => {
    const { opponent, description, deadline } = req.body;

    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    // Insert the bet into the database
    const query = `INSERT INTO bets (creator_username, opponent_username, description, deadline) VALUES (?, ?, ?, ?)`;
    db.run(query, [req.session.username, opponent, description, deadline], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Error creating bet.');
        }

        res.redirect('/dashboard');
    });
});

// Registration route
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Check if the username and password are provided
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    // Check if user already exists
    const userExists = users.find(user => user.username === username);
        if (userExists) {
            return res.send('User already exists. Please choose another username.');
        }
    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error hashing the password.');
        }

        // Save the new user to the database
        const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
        db.run(query, [username, hashedPassword], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Error saving user to database.');
            }

            // Redirect to login page after successful registration
            res.redirect('/login');
        });
    });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Query the database to find the user by username
    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error querying the database.');
        }

        if (!row) {
            return res.status(401).send('Invalid credentials');
        }

        // Compare the provided password with the stored hashed password
        bcrypt.compare(password, row.password, (err, isMatch) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error comparing passwords.');
            }

            if (!isMatch) {
                return res.status(401).send('Invalid credentials');
            }

            // If passwords match, create a session and log the user in
            req.session.loggedIn = true;
            req.session.username = row.username;
            res.redirect('/dashboard');
        });
    });
});

// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send('Internal server error. Please try again later.');
        }
        res.redirect('/login');
    });
});

// Dashboard route (only accessible when logged in)
app.get('/dashboard', (req, res) => {
    // Check if user is logged in by checking the session
    if (!req.session.loggedIn) {
        return res.redirect('/login');  // Redirect to login if not logged in
    }

    // If logged in, render the dashboard with the username
    res.render('dashboard', { username: req.session.username });
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: "Something went wrong" });
});

// 404 Error Handling
app.use((req, res) => res.status(404).render('error', { message: "Page Not Found" }));

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

