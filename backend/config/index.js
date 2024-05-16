// файл ./config/index.js
const fs = require('fs');

const config = {
	db: {
    mysql : {
      host: 'db-mysql-fra1-51752-do-user-9208055-0.c.db.ondigitalocean.com', // Или IP-адрес вашего сервера MySQL
      user: 'user1', // Имя пользователя MySQL
      password: 'AVNS_PPlK01BLbk49RwcS7jR', // Пароль пользователя MySQL
      database: 'db1', // Имя вашей базы данных
      port: 25060, // порт базы данных
			ssl: {
			  ca: fs.readFileSync('E:\\Nodejs\\backend\\ca-certificate-test.crt'), // Путь к файлу ca.crt
			}
    },
  }, 
  port: 3000, // порт на котором будет запущен сервер приложения
  jwtSecret: 'meyson'
};

module.exports =  config;
