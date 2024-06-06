const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const port = 3000;

app.use(bodyParser.json());

let db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run("CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT)");
  db.run("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL, categoryId INTEGER, FOREIGN KEY(categoryId) REFERENCES categories(id))");
});

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes for categories
app.get('/categories', (req, res) => {
  db.all("SELECT * FROM categories", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/categories', (req, res) => {
  const { name } = req.body;
  db.run("INSERT INTO categories (name) VALUES (?)", [name], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, name });
  });
});

app.get('/categories/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM categories WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || { message: 'Category not found' });
  });
});

app.put('/categories/:id', (req, res) => {
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

app.delete('/categories/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM categories WHERE id = ?", [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Category deleted' });
  });
});

// Routes for products
app.get('/products', (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/products', (req, res) => {
  const { name, price, categoryId } = req.body;
  db.run("INSERT INTO products (name, price, categoryId) VALUES (?, ?, ?)", [name, price, categoryId], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, name, price, categoryId });
  });
});

app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || { message: 'Product not found' });
  });
});

app.put('/products/:id', (req, res) => {
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

app.delete('/products/:id', (req, res) => {
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
