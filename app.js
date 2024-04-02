// файл ./app.js
const express = require('express');
const mysql = require('mysql');
const config = require('./config');

const app = express();
const port = config.port;

app.use(express.json());

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
  // Пример запроса к базе данных
  dbConnection.query('SELECT * FROM tasks', (err, results) => {
    if (err) {
      console.error('Ошибка выполнения запроса: ' + err.stack);
      res.status(500).send('Ошибка сервера');
      return;
    }
    console.log('Результаты запроса:', results);
    res.json(results);
  });
});

//!!!Get отдельного task
app.get('/getTask/:id', (req, res) => {
  const taskId = req.params.id;

  dbConnection.query('SELECT * FROM tasks WHERE id = ?', [taskId], (err, result) => {
    if (err) {
      console.error('Ошибка выполнения запроса: ' + err.stack);
      res.status(500).send('Ошибка сервера');
      return;
    }
    if (result.length === 0) {
      res.status(404).send('Задача не найдена');
      return;
    }
    console.log('Результаты запроса:', result);
    res.json(result);
  });
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
  // Получение имени задачи из тела запроса
  console.log('req.body: ', req.body);
  const taskName = req.body.name;

  // Проверка наличия имени задачи в теле запроса
  if (!taskName) {
    res.status(400).send('Не указано имя задачи');
    return;
  }

  // SQL-запрос для добавления записи с указанным именем в таблицу tasks
  const sqlQuery = `INSERT INTO tasks (name) VALUES ('${taskName}')`;

  // Выполнение SQL-запроса к базе данных
  dbConnection.query(sqlQuery, (err, result) => {
    if (err) {
      console.error('Ошибка выполнения запроса: ' + err.stack);
      res.status(500).send('Ошибка сервера');
      return;
    }
    console.log('Запись успешно добавлена в таблицу tasks');
    res.send('Запись успешно добавлена в таблицу tasks');
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});