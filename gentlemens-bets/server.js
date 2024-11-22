const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-memory user storage (for simplicity)
let users = [];  // This will store users as { username: '...', password: '...' }

// Set up session middleware
app.use(session({
    secret: 'mysecret',  // Secret key for signing the session ID cookie
    resave: false,
    saveUninitialized: true
}));

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

// Handle registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Check if user already exists
    const userExists = users.find(user => user.username === username);
    if (userExists) {
        return res.send('User already exists. Please choose another username.');
    }

    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.send('Error hashing password');

        // Save user to in-memory storage
        users.push({ username, password: hashedPassword });
        res.send('Registration successful! You can now <a href="/login">login</a>.');
    });
});

// Handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Find the user
    const user = users.find(user => user.username === username);
    if (!user) {
        return res.send('Invalid username or password.');
    }

    // Compare the entered password with the stored hashed password
    bcrypt.compare(password, user.password, (err, result) => {
        if (err) return res.send('Error checking password');
        if (result) {
            // Password matched, start a session
            req.session.loggedIn = true;
            req.session.username = username;
            res.redirect('/dashboard');
        } else {
            res.send('Invalid username or password.');
        }
    });
});

// 404 Error Handling
app.use((req, res) => res.status(404).render('error', { message: "Page Not Found" }));

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

