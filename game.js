// game.js - УПРОЩЕННАЯ РАБОЧАЯ ВЕРСИЯ
console.log("=== ИГРА ЗАГРУЖЕНА ===");

// Основные переменные
let canvas, ctx;
let player = { x: 400, y: 500, radius: 20 };
let asteroids = [];
let score = 0;
let gameRunning = false;
let animationId;

// Инициализация
function initGame() {
    console.log("Инициализация игры...");
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    if (!canvas || !ctx) {
        console.error("Canvas не найден!");
        return;
    }
    
    // Устанавливаем размер
    canvas.width = 800;
    canvas.height = 600;
    
    // Обработчики управления
    canvas.addEventListener('mousedown', handleMouse);
    canvas.addEventListener('touchstart', handleTouch);
    
    console.log("Игра инициализирована!");
}

// Управление мышью
function handleMouse(e) {
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left;
    player.y = e.clientY - rect.top;
}

// Управление касанием
function handleTouch(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    player.x = touch.clientX - rect.left;
    player.y = touch.clientY - rect.top;
}

// Создание астероида
function createAsteroid() {
    asteroids.push({
        x: Math.random() * canvas.width,
        y: -30,
        radius: 20 + Math.random() * 20,
        speed: 2 + Math.random() * 3
    });
}

// Обновление игры
function update() {
    // Двигаем астероиды
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        a.y += a.speed;
        
        // Проверка столкновения
        const dx = a.x - player.x;
        const dy = a.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < a.radius + player.radius) {
            // Конец игры
            gameOver();
            return;
        }
        
        // Удаляем вышедшие за экран
        if (a.y > canvas.height + 50) {
            asteroids.splice(i, 1);
            score += 10;
            document.getElementById('score').textContent = `Очки: ${score}`;
        }
    }
    
    // Создаем новые астероиды
    if (Math.random() < 0.02) {
        createAsteroid();
    }
}

// Отрисовка
function draw() {
    // Фон
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Звезды
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.arc(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 2,
            0, Math.PI * 2
        );
        ctx.fill();
    }
    
    // Астероиды
    asteroids.forEach(a => {
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Кратеры
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(a.x - 5, a.y - 5, a.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Корабль
    ctx.fillStyle = '#4cc9f0';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.radius);
    ctx.lineTo(player.x - player.radius, player.y + player.radius);
    ctx.lineTo(player.x + player.radius, player.y + player.radius);
    ctx.closePath();
    ctx.fill();
    
    // Кабина
    ctx.fillStyle = '#a8dadc';
    ctx.beginPath();
    ctx.arc(player.x, player.y - 10, 8, 0, Math.PI * 2);
    ctx.fill();
}

// Игровой цикл
function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Начало игры
function startGame() {
    console.log("Старт игры!");
    
    // Скрываем экраны
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    
    // Сброс
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    asteroids = [];
    score = 0;
    document.getElementById('score').textContent = `Очки: 0`;
    
    // Запуск
    gameRunning = true;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();
}

// Конец игры
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    // Обновляем рекорд
    const highScore = localStorage.getItem('hyperDodgerHighScore') || 0;
    if (score > highScore) {
        localStorage.setItem('hyperDodgerHighScore', score);
        document.getElementById('highScore').textContent = `Рекорд: ${score}`;
    }
    
    // Показываем результат
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

// Делаем функции глобальными
window.startGame = startGame;
window.initGame = initGame;

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM ready, initializing game...");
    initGame();
    
    // Обработчики кнопок
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', startGame);
    
    // Загружаем рекорд
    const highScore = localStorage.getItem('hyperDodgerHighScore') || 0;
    document.getElementById('highScore').textContent = `Рекорд: ${highScore}`;
});

console.log("Game script loaded successfully!");
