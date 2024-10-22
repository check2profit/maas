// Загружаем данные о клиентах и операторах
let clientsData;
let operatorsData;

fetch('./../assets/config.json')
  .then((response) => response.json())
  .then((data) => {
    clientsData = data.clients;
    loadClientsToSidebar();
  });

fetch('./../assets/operators.json')
  .then((response) => response.json())
  .then((data) => {
    operatorsData = data.operators;
  });

// Загружаем клиентов в боковую панель
function loadClientsToSidebar() {
  const clientList = document.getElementById('client-list');
  clientsData.forEach((client, index) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = client.name;

    // Добавляем обработчик клика
    a.onclick = function () {
      clearActiveClasses(); // Сброс старой подсветки
      a.classList.add('is-active'); // Подсветить текущий элемент
      displayClientForms(index);
    };
    li.appendChild(a);
    clientList.appendChild(li);
  });
}

// Сброс всех активных классов

function clearActiveClasses() {
  const clientLinks = document.querySelectorAll('#client-list a');
  clientLinks.forEach((link) => link.classList.remove('is-active'));
}

// Отображаем формы и кнопку для нарушений для выбранного клиента
function displayClientForms(clientIndex) {
  const client = clientsData[clientIndex];
  const clientNameElement = document.getElementById('client-name');
  const formsList = document.getElementById('forms-list');
  const violationsButton = document.getElementById('violations-open-button');

  clientNameElement.textContent = client.name;
  formsList.innerHTML = ''; // Очищаем список форм

  // Добавляем формы в список
  client.forms.forEach((form) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = form.title;
    a.href = form.link;
    a.target = '_blank';
    a.className = 'text-align-center';
    li.appendChild(a);
    li.className = 'box cell-border';
    formsList.appendChild(li);
  });

  // Проверяем наличие формы нарушений у клиента
  if (client.violations) {
    violationsButton.style.display = 'block';
    setupViolationsForm(client);
  } else {
    violationsButton.style.display = 'none';
  }
}

// Настройка модальной формы для нарушения
function setupViolationsForm(client) {
  const violationsModal = document.getElementById('violations__modal');
  const violationsFormOpenButton = document.getElementById(
    'violations-open-button'
  );
  const modalCloseButton = document.getElementsByClassName(
    'violations__close-button'
  )[0];
  const submitButton = document.getElementById('submit-button');
  const datetimeInput = document.getElementById('violations-datetime');
  const image = document.getElementById('myImage');

  // Заполняем категории и торговые точки
  populateSelect('category', client.violations.categories);
  populateSelect('sales-point', client.violations.sales_points);
  populateSelect('operator', operatorsData); // Операторов берем из отдельного файла

  // Открытие модального окна
  violationsFormOpenButton.onclick = function () {
    violationsModal.style.display = 'flex';
    document.getElementById('violations').reset();
    image.src = ''; // Очищаем изображение
    image.style.display = 'none';
  };

  // Закрытие модального окна
  modalCloseButton.onclick = function () {
    violationsModal.style.display = 'none';
  };

  // Обработка вставки изображения
  document.onpaste = function (event) {
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image')) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = function (e) {
          image.src = e.target.result;
          image.style.display = 'block';
          submitButton.disabled = false;
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  // Отправка формы
  document
    .getElementById('violations')
    .addEventListener('submit', function (event) {
      event.preventDefault();
      sendViolationToTelegram(client);
    });
}

// Заполнение select
function populateSelect(elementId, items) {
  const select = document.getElementById(elementId);
  select.innerHTML = '';
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

// Отправка данных о нарушении в Telegram
function sendViolationToTelegram(client) {
  const category = document.getElementById('category').value;
  const operator = document.getElementById('operator').value;
  const salesPoint = document.getElementById('sales-point').value;
  const violationDateTime = document.getElementById(
    'violations-datetime'
  ).value;
  const message = document.getElementById('message').value || '-';
  const formattedDate = `${violationDateTime.split('T')[0]}, ${
    violationDateTime.split('T')[1]
  }`;
  const formattedMessage = `*Дата и время:* ${formattedDate}\n*Магазин:* ${salesPoint}\n*Нарушение:* ${category}\n*Комментарий:* ${message}\n*Оператор:* ${operator}`;

  const formData = new FormData();
  formData.append('chat_id', client.violations.telegram_chat_id);
  formData.append('caption', formattedMessage);
  formData.append('parse_mode', 'Markdown');

  const image = document.getElementById('myImage');
  if (image.src.startsWith('data:image')) {
    const dataUrl = image.src;
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const imageFile = new File([ab], 'screenshot.png', { type: mimeString });
    formData.append('photo', imageFile);
  }

  fetch(
    `https://api.telegram.org/bot${client.violations.telegram_token}/sendPhoto`,
    {
      method: 'POST',
      body: formData,
    }
  )
    .then((response) => {
      if (response.ok) {
        document.getElementById('violations__modal').style.display = 'none';
        showNotification('Сообщение успешно отправлено в Telegram');
      } else {
        throw new Error('Ошибка при отправке сообщения');
      }
    })
    .catch((error) => {
      console.error('Ошибка отправки в Telegram:', error);
      showNotification('Ошибка при отправке сообщения');
    });
}

// Уведомление
function showNotification(message) {
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notification-text');
  notificationText.textContent = message;
  notification.style.display = 'flex';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
  document.getElementById('notification-close').onclick = function () {
    notification.style.display = 'none';
  };
}
