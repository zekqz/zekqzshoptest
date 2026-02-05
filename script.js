// Оставляем как есть — логика не меняется
document.querySelectorAll('.order-btn').forEach(button => {
  button.addEventListener('click', () => {
    const service = button.getAttribute('data-service');
    document.getElementById('modal-service').textContent = `Вы выбрали: ${getServiceName(service)}`;
    document.getElementById('orderModal').style.display = 'block';
  });
});


document.querySelector('.close').addEventListener('click', () => {
document.getElementById('orderModal').style.display = 'none';
});

window.addEventListener('click', (e) => {
const modal = document.getElementById('orderModal');
if (e.target === modal) {
modal.style.display = 'none';
}
});

document.getElementById('orderForm').addEventListener('submit', (e) => {
e.preventDefault();
alert('Заказ отправлен! Мы свяжемся с вами в течение 10 минут.');
document.getElementById('orderForm').reset();
document.getElementById('orderModal').style.display = 'none';
});

function getServiceName(code) {
const names = {
'скины': 'Скины и донат',
'рост': 'Рост рейтинга',
'аккаунт': 'Топ-аккаунты',
'ремонт': 'Ремонт аккаунтов'
};
return names[code] || code;
}