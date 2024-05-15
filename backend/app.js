// файл ./app.js
const express = require('express');
const mysql = require('mysql');
const config = require('./config');
const cors = require('cors');
const app = express();

const jwt = require('jsonwebtoken');
const port = config.port;
const bcrypt = require('bcrypt');
app.use(express.json());
app.use(cors());

// Конфигурация подключения к базе данных
const dbConnection = mysql.createConnection(config.db.mysql);

// Подключение к базе данных
dbConnection.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных: ' + err.stack);
    return;
  }
  console.log('Подключение к базе данных успешно установлено');
});

// Пример маршрута Express
app.get('/getTasks', (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const username = decoded.username;

    dbConnection.query('SELECT id FROM users WHERE username = ?', [username], (err, results) => {
      if (err) {
        console.error('Ошибка выполнения запроса: ' + err.stack);
        res.status(500).send('Ошибка сервера');
        return;
      }

      const userId = results[0].id;

      dbConnection.query('SELECT * FROM tasks WHERE userId = ?', [userId], (err, tasks) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }
        res.json(tasks);
      });
    });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(401).send('Неверный токен');
  }
});


//!!!Удаление задачи task
app.delete('/deleteTask/:id', (req, res) => {
  const taskId = req.params.id;

  dbConnection.query('DELETE FROM tasks WHERE id = ?', [taskId], (err, result) => {
    if (err) {
      console.error('Ошибка выполнения запроса: ' + err.stack);
      res.status(500).send('Ошибка сервера');
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).send('Задача не найдена');
      return;
    }
    console.log('Задача успешно удалена');
    res.send('Задача успешно удалена');
  });
});

app.delete('/deleteAccount', (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const username = decoded.username;

    dbConnection.query('DELETE FROM users WHERE username = ?', [username], (err, result) => {
      if (err) {
        console.error('Ошибка выполнения запроса: ' + err.stack);
        res.status(500).send('Ошибка сервера');
        return;
      }
      dbConnection.query('DELETE FROM tasks WHERE userId = ?', [result.insertId], (err) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }
        res.send('Аккаунт и связанные задачи успешно удалены');
      });
    });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(401).send('Неверный токен');
  }
});

//!!!Редактирование task
app.put('/updateTask/:id', (req, res) => {
  const taskId = req.params.id;
  const { name } = req.body;

  if (!name) {
    res.status(400).send('Не указано новое имя задачи');
    return;
  }

  dbConnection.query('UPDATE tasks SET name = ? WHERE id = ?', [name, taskId], (err, result) => {
    if (err) {
      console.error('Ошибка выполнения запроса: ' + err.stack);
      res.status(500).send('Ошибка сервера');
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).send('Задача не найдена');
      return;
    }
    console.log('Задача успешно обновлена');
    res.send('Задача успешно обновлена');
  });
});

// Пример маршрута Express для добавления записи в таблицу tasks с указанным именем
app.post('/addTask', (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const taskName = req.body.name;

  if (!taskName) {
    res.status(400).send('Не указано имя задачи');
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const username = decoded.username;

    dbConnection.query('SELECT id FROM users WHERE username = ?', [username], (err, results) => {
      if (err) {
        console.error('Ошибка выполнения запроса: ' + err.stack);
        res.status(500).send('Ошибка сервера');
        return;
      }

      const userId = results[0].id;

      const sqlQuery = 'INSERT INTO tasks (name, userId) VALUES (?, ?)';
      dbConnection.query(sqlQuery, [taskName, userId], (err, result) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }
        res.send('Запись успешно добавлена в таблицу tasks');
      });
    });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(401).send('Неверный токен');
  }
});

// файл ./backend/app.js

// Регистрация пользователя
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    // Сохранение пользователя в базе данных
    dbConnection.query(
      `INSERT INTO users (username, password) VALUES ('${username}', '${hashedPassword}')`,
      (err, result) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }
        console.log('Пользователь успешно зарегистрирован');
        res.status(201).send('Пользователь успешно зарегистрирован');
      }
    );
  } catch (error) {
    console.error('Ошибка при регистрации пользователя:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Вход пользователя
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Поиск пользователя в базе данных
    dbConnection.query(
      `SELECT * FROM users WHERE username = '${username}'`,
      async (err, results) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }
        if (results.length === 0) {
          res.status(401).send('Неверные учетные данные');
          return;
        }
        const user = results[0];
        // Проверка пароля
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          res.status(401).send('Неверные учетные данные');
          return;
        }
        // Генерация JWT токена
        const token = jwt.sign({ username: user.username }, config.jwtSecret);
        res.status(200).json({ token });
      }
    );
  } catch (error) {
    console.error('Ошибка при входе пользователя:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Проверка аутентификации с использованием JWT
app.get('/profile', (req, res) => {
  // Получение токена из заголовка Authorization
  const token = req.headers.authorization.split(' ')[1];
  try {
    // Проверка токена
    const decoded = jwt.verify(token, config.jwtSecret);
    res.status(200).json({ username: decoded.username });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(401).send('Неверный токен');
  }
});
// Запуск сервера
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
