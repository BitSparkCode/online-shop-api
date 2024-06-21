const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const port = 3000;
const secretKey = 'your_secret_key';

app.use(bodyParser.json());

let db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run("CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT)");
  db.run("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL, categoryId INTEGER, FOREIGN KEY(categoryId) REFERENCES categories(id))");
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)");
  
  const hashedAdminPassword = bcrypt.hashSync('admin', 10);
  db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedAdminPassword, 'admin']);
});

// Middleware zur Authentifizierung
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Route zur Registrierung
app.post('/register', (req, res) => {
  const { username, password, role = 'user' } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, hashedPassword, role], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, username, role });
  });
});

// Route zur Anmeldung
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign({ username: user.username, role: user.role }, secretKey);
    res.json({ token });
  });
});

// Route zum Zurücksetzen des Passworts
app.post('/reset-password', authenticateToken, (req, res) => {
  const { username, newPassword } = req.body;
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.run("UPDATE users SET password = ? WHERE username = ?", [hashedPassword, username], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Password reset successfully' });
  });
});

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes for categories (protected)
app.get('/categories', authenticateToken, (req, res) => {
  db.all("SELECT * FROM categories", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/categories', authenticateToken, (req, res) => {
  const { name } = req.body;
  db.run("INSERT INTO categories (name) VALUES (?)", [name], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, name });
  });
});

app.get('/categories/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM categories WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || { message: 'Category not found' });
  });
});

app.put('/categories/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  db.run("UPDATE categories SET name = ? WHERE id = ?", [name, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id, name });
  });
});

app.delete('/categories/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM categories WHERE id = ?", [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Category deleted' });
  });
});

// Routes for products (protected)
app.get('/products', authenticateToken, (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/products', authenticateToken, (req, res) => {
  const { name, price, categoryId } = req.body;
  db.run("INSERT INTO products (name, price, categoryId) VALUES (?, ?, ?)", [name, price, categoryId], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, name, price, categoryId });
  });
});

app.get('/products/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || { message: 'Product not found' });
  });
});

app.put('/products/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, price, categoryId } = req.body;
  db.run("UPDATE products SET name = ?, price = ?, categoryId = ? WHERE id = ?", [name, price, categoryId, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id, name, price, categoryId });
  });
});

app.delete('/products/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Product deleted' });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});