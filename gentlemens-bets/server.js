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
    if (req.session.loggedIn) {
        res.render('dashboard', { username: req.session.username });
    } else {
        res.redirect('/login');
    }
});  // Dashboard page

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

// 404 Error Handling
app.use((req, res) => res.status(404).render('error', { message: "Page Not Found" }));

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

