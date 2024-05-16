// файл ./frontend/script.js

// Функция для загрузки задач с сервера
function loadTasks() {
  const token = localStorage.getItem('token');
  fetch('http://localhost:3000/getTasks', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => response.json())
    .then(tasks => {
      const taskList = document.getElementById('taskList');
      taskList.innerHTML = '';
      tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = task.name;
        taskList.appendChild(li);
      });
    })
    .catch(error => console.error('Error fetching tasks:', error));
}

// Функция для добавления задачи на сервер
function addTask(taskName) {
  const token = localStorage.getItem('token');
  fetch('http://localhost:3000/addTask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name: taskName })
  })
    .then(response => response.text())
    .then(message => {
      console.log(message);
      loadTasks(); // После добавления задачи перезагружаем список задач
    })
    .catch(error => console.error('Error adding task:', error));
}

// Обработчик события отправки формы
document.getElementById('taskForm').addEventListener('submit', function (event) {
  event.preventDefault(); // Предотвращаем перезагрузку страницы
  const taskInput = document.getElementById('taskInput');
  const taskName = taskInput.value.trim();
  if (taskName !== '') {
    addTask(taskName); // Вызываем функцию добавления задачи
    taskInput.value = ''; // Очищаем поле ввода
  }
});
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        document.getElementById('logoutButton').style.display = 'block';
        document.getElementById('deleteAccountButton').style.display = 'block';
        alert('Вы успешно вошли');
        window.location.reload(); // Перезагружаем страницу после входа
      } else {
        throw new Error('Не получен токен');
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      alert('Ошибка при входе');
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;
    try {
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      alert('Пользователь успешно зарегистрирован');
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      alert('Ошибка при регистрации');
    }
  });

  const token = localStorage.getItem('token');
  if (token) {
    fetch('http://localhost:3000/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Не удалось получить данные пользователя');
      }
    })
    .then(data => {
      console.log('Данные пользователя:', data);
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('taskForm').style.display = 'block';
      document.getElementById('logoutButton').style.display = 'block';
      document.getElementById('deleteAccountButton').style.display = 'block';
      const userDisplay = document.createElement('p');
      userDisplay.textContent = `Привет, ${data.username}!`;
      document.body.insertBefore(userDisplay, document.getElementById('taskForm'));
      loadTasks(); // Загружаем задачи, теперь, когда пользователь аутентифицирован
    })
    .catch(error => {
      console.error('Error:', error);
      localStorage.removeItem('token'); // При ошибке удаляем неверный токен
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('registerForm').style.display = 'block';
    });
  } else {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'block';
  }

  document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.reload(); // Перезагружаем страницу для обновления интерфейса
  });

  document.getElementById('deleteAccountButton').addEventListener('click', async () => {
    const confirmDelete = confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.');
    if (confirmDelete) {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('http://localhost:3000/deleteAccount', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          alert('Аккаунт успешно удален');
          localStorage.removeItem('token');
          window.location.reload();
        } else {
          throw new Error('Не удалось удалить аккаунт');
        }
      } catch (error) {
        console.error('Ошибка при удалении аккаунта:', error);
        alert('Ошибка при удалении аккаунта');
      }
    }
  });

  function loadTasks() {
    const token = localStorage.getItem('token');
    fetch('http://localhost:3000/getTasks', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(tasks => {
      const taskList = document.getElementById('taskList');
      taskList.innerHTML = '';
      tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = task.name;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteTask(task.id));
        li.appendChild(deleteButton);
        const editButton = document.createElement('button');
        editButton.textContent = 'Change';
        editButton.addEventListener('click', () => changeTask(task.id, prompt('New task name:', task.name)));
        li.appendChild(editButton);
        taskList.appendChild(li);
      });
    })
    .catch(error => console.error('Error fetching tasks:', error));
  }

  function addTask(taskName) {
    const token = localStorage.getItem('token');
    fetch('http://localhost:3000/addTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: taskName })
    })
    .then(response => response.text())
    .then(message => {
      console.log(message);
      loadTasks(); // После добавления задачи перезагружаем список задач
    })
    .catch(error => console.error('Error adding task:', error));
  }

  function deleteTask(taskId) {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/deleteTask/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.text())
    .then(message => {
      console.log(message);
      loadTasks(); // После удаления задачи перезагружаем список задач
    })
    .catch(error => console.error('Error deleting task:', error));
  }

  function changeTask(taskId, newTaskName) {
    if (!newTaskName) return; // Если пользователь отменил изменение
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/updateTask/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newTaskName })
    })
    .then(response => response.text())
    .then(message => {
      console.log(message);
      loadTasks(); // После изменения задачи перезагружаем список задач
    })
    .catch(error => console.error('Error updating task:', error));
  }

  document.getElementById('taskForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Предотвращаем перезагрузку страницы
    const taskInput = document.getElementById('taskInput');
    const taskName = taskInput.value.trim();
    if (taskName !== '') {
      addTask(taskName); // Вызываем функцию добавления задачи
      taskInput.value = ''; // Очищаем поле ввода
    }
  });
});
