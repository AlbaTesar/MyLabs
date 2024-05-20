const express = require('express');
const mysql = require('mysql');
const config = require('./config');
const cors = require('cors');
const path = require('path');
const app = express();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

app.use(express.json());
app.use(cors());

// Указываем, где находятся статические файлы
app.use(express.static(path.join(__dirname, 'frontend')));

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

// Настройка nodemailer для отправки писем
const transporter = nodemailer.createTransport({
  host: 'smtp.yandex.ru',
  port: 587,
  secure: false,
  auth: {
    user: 'nodemailer1@yandex.ru',
    pass: 'ltqlzwiqduruegth' // пароль
  }
});

// CRUD операции для папок и задач

// Получение всех папок и задач
app.get('/getFoldersAndTasks', (req, res) => {
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

      if (results.length === 0) {
        res.status(404).send('Пользователь не найден');
        return;
      }

      const userId = results[0].id;

      dbConnection.query('SELECT * FROM folders WHERE userId = ?', [userId], (err, folders) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }

        dbConnection.query('SELECT * FROM tasks WHERE userId = ?', [userId], (err, tasks) => {
          if (err) {
            console.error('Ошибка выполнения запроса: ' + err.stack);
            res.status(500).send('Ошибка сервера');
            return;
          }

          const data = { folders, tasks };
          res.json(data);
        });
      });
    });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(401).send('Неверный токен');
  }
});

// Добавление новой папки и задачи
app.post('/addFolderAndTask', (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const { folderName, taskName } = req.body;

  if (!folderName || !taskName) {
    res.status(400).send('Не указано имя папки или задачи');
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

      if (results.length === 0) {
        res.status(404).send('Пользователь не найден');
        return;
      }

      const userId = results[0].id;

      // Добавление папки, если она не существует
      dbConnection.query('SELECT id FROM folders WHERE name = ? AND userId = ?', [folderName, userId], (err, folderResults) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }

        if (folderResults.length === 0) {
          // Папка не существует, создаем ее
          dbConnection.query('INSERT INTO folders (name, userId) VALUES (?, ?)', [folderName, userId], (err, folderInsertResult) => {
            if (err) {
              console.error('Ошибка выполнения запроса: ' + err.stack);
              res.status(500).send('Ошибка сервера');
              return;
            }

            const folderId = folderInsertResult.insertId;
            // Добавляем задачу в новую папку
            dbConnection.query('INSERT INTO tasks (name, userId, folder) VALUES (?, ?, ?)', [taskName, userId, folderId], (err, taskInsertResult) => {
              if (err) {
                console.error('Ошибка выполнения запроса: ' + err.stack);
                res.status(500).send('Ошибка сервера');
                return;
              }
              res.send('Папка и задача успешно добавлены');
            });
          });
        } else {
          // Папка существует, добавляем задачу
          const folderId = folderResults[0].id;
          dbConnection.query('INSERT INTO tasks (name, userId, folder) VALUES (?, ?, ?)', [taskName, userId, folderId], (err, taskInsertResult) => {
            if (err) {
              console.error('Ошибка выполнения запроса: ' + err.stack);
              res.status(500).send('Ошибка сервера');
              return;
            }
            res.send('Задача успешно добавлена в существующую папку');
          });
        }
      });
    });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(401).send('Неверный токен');
  }
});

// Удаление папки и задач в ней
app.delete('/deleteFolder/:id', (req, res) => {
  const folderId = req.params.id;

  dbConnection.query('DELETE FROM tasks WHERE folder = ?', [folderId], (err) => {
    if (err) {
      console.error('Ошибка выполнения запроса: ' + err.stack);
      res.status(500).send('Ошибка сервера');
      return;
    }

    dbConnection.query('DELETE FROM folders WHERE id = ?', [folderId], (err, result) => {
      if (err) {
        console.error('Ошибка выполнения запроса: ' + err.stack);
        res.status(500).send('Ошибка сервера');
        return;
      }
      if (result.affectedRows === 0) {
        res.status(404).send('Папка не найдена');
        return;
      }
      res.send('Папка и связанные задачи успешно удалены');
    });
  });
});

// Редактирование папки
app.put('/updateFolder/:id', (req, res) => {
  const folderId = req.params.id;
  const { name } = req.body;

  if (!name) {
    res.status(400).send('Не указано новое имя папки');
    return;
  }

  dbConnection.query('UPDATE folders SET name = ? WHERE id = ?', [name, folderId], (err, result) => {
    if (err) {
      console.error('Ошибка выполнения запроса: ' + err.stack);
      res.status(500).send('Ошибка сервера');
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).send('Папка не найдена');
      return;
    }
    res.send('Папка успешно обновлена');
  });
});

// Удаление задачи
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

// Редактирование задачи
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

// Удаление аккаунта
app.delete('/deleteAccount', (req, res) => {
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

      if (results.length === 0) {
        res.status(404).send('Пользователь не найден');
        return;
      }

      const userId = results[0].id;

      // Удаление всех задач пользователя
      dbConnection.query('DELETE FROM tasks WHERE userId = ?', [userId], (err) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }

        // Удаление всех папок пользователя
        dbConnection.query('DELETE FROM folders WHERE userId = ?', [userId], (err) => {
          if (err) {
            console.error('Ошибка выполнения запроса: ' + err.stack);
            res.status(500).send('Ошибка сервера');
            return;
          }

          // Удаление пользователя
          dbConnection.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
            if (err) {
              console.error('Ошибка выполнения запроса: ' + err.stack);
              res.status(500).send('Ошибка сервера');
              return;
            }
            res.send('Аккаунт и все связанные данные успешно удалены');
          });
        });
      });
    });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(401).send('Неверный токен');
  }
});

// Регистрация пользователя
app.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Проверка на существующий email
    dbConnection.query(
      `SELECT * FROM users WHERE email = ?`,
      [email],
      async (err, results) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }
        if (results.length > 0) {
          res.status(409).send('Пользователь с таким email уже существует');
          return;
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Сохранение пользователя в базе данных
        dbConnection.query(
          `INSERT INTO users (username, password, email) VALUES (?, ?, ?)`,
          [username, hashedPassword, email],
          async (err, result) => {
            if (err) {
              console.error('Ошибка выполнения запроса: ' + err.stack);
              res.status(500).send('Ошибка сервера');
              return;
            }

            const userId = result.insertId;

            // Генерация токена подтверждения почты, который живет 1 день
            const emailConfirmToken = jwt.sign({ userId, email }, config.jwtSecret, { expiresIn: '1d' });

            // Сохранение кода подтверждения в таблице email_confirmation
            dbConnection.query(
              `INSERT INTO email_confirmation (userId, emailConfirmToken) VALUES (?, ?)`,
              [userId, emailConfirmToken],
              (err, result) => {
                if (err) {
                  console.error('Ошибка сохранения кода подтверждения: ' + err.stack);
                  res.status(500).send('Ошибка сервера');
                  return;
                }

                console.log('Код подтверждения успешно создан');

                // Отправка письма с подтверждением почты
                const mailOptions = {
                  from: 'nodemailer1@yandex.ru',
                  to: email,
                  subject: 'Подтверждение регистрации',
                  html: `<p>Для подтверждения регистрации перейдите по ссылке: <a href="http://localhost:3000/confirm/${emailConfirmToken}">Подтвердить регистрацию</a></p>`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.error('Ошибка при отправке письма:', error);
                    res.status(500).send('Ошибка сервера');
                  } else {
                    console.log('Письмо с подтверждением отправлено:', info.response);
                    res.status(201).send('Пользователь успешно зарегистрирован. Проверьте вашу почту для подтверждения регистрации.');
                  }
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Ошибка при регистрации пользователя:', error);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/confirm/:token', async (req, res) => {
  try {
    const token = req.params.token;

    // Раскодирование токена
    const decoded = jwt.verify(token, config.jwtSecret);
    const { userId, email } = decoded;

    // Поиск кода подтверждения в базе данных
    dbConnection.query(
      `SELECT * FROM email_confirmation WHERE userId = ? AND emailConfirmToken = ?`,
      [userId, token],
      (err, results) => {
        if (err) {
          console.error('Ошибка выполнения запроса: ' + err.stack);
          res.status(500).send('Ошибка сервера');
          return;
        }

        if (results.length === 0) {
          res.status(404).send('Код подтверждения не найден');
          return;
        }

        // Удаление кода подтверждения из таблицы email_confirmation
        dbConnection.query(
          `DELETE FROM email_confirmation WHERE userId = ? AND emailConfirmToken = ?`,
          [userId, token],
          (err, result) => {
            if (err) {
              console.error('Ошибка удаления кода подтверждения: ' + err.stack);
              res.status(500).send('Ошибка сервера');
              return;
            }

            console.log('Код подтверждения успешно удален');

            // Обновление поля isConfirmed для пользователя
            dbConnection.query(
              'UPDATE users SET isConfirmed = true WHERE id = ?',
              [userId],
              (err, result) => {
                if (err) {
                  console.error('Ошибка обновления пользователя: ' + err.stack);
                  res.status(500).send('Ошибка сервера');
                  return;
                }

                res.status(200).send('Регистрация успешно подтверждена');
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Ошибка при подтверждении регистрации:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Вход пользователя
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Поиск пользователя в базе данных
    dbConnection.query(
      `SELECT * FROM users WHERE username = ?`,
      [username],
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
        // Проверка подтверждения почты
        if (!user.isConfirmed) {
          res.status(401).send('Почта не подтверждена');
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

// Сброс пароля
app.post('/forgotPassword', async (req, res) => {
  const { email } = req.body;

  dbConnection.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Ошибка выполнения запроса: ' + err.stack);
      res.status(500).send('Ошибка сервера');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Пользователь с таким email не найден');
      return;
    }

    const user = results[0];
    const resetToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '1h' });

    const mailOptions = {
      from: 'nodemailer1@yandex.ru',
      to: email,
      subject: 'Сброс пароля',
      html: `<p>Для сброса пароля перейдите по ссылке: <a href="http://localhost:3000/reset-password.html?token=${resetToken}">Сбросить пароль</a></p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Ошибка при отправке письма:', error);
        res.status(500).send('Ошибка сервера');
      } else {
        console.log('Письмо для сброса пароля отправлено:', info.response);
        res.status(200).send('Письмо для сброса пароля отправлено на вашу почту');
      }
    });
  });
});

app.post('/resetPassword/:token', async (req, res) => {
  const token = req.params.token;
  const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const { userId } = decoded;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    dbConnection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (err, result) => {
      if (err) {
        console.error('Ошибка выполнения запроса: ' + err.stack);
        res.status(500).send('Ошибка сервера');
        return;
      }
      res.status(200).send('Пароль успешно сброшен');
    });
  } catch (error) {
    console.error('Ошибка при сбросе пароля:', error);
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
