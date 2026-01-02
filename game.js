// game.js - ПОЛНЫЙ КОД ИГРЫ
// Инициализация элементов
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');

// Устанавливаем размер канваса
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);

// Игровые переменные
let player = { 
    x: 0, y: 0, radius: 20,
    color: '#4cc9f0', isExploding: false,
    explosionProgress: 0, velocityX: 0, velocityY: 0,
    rotation: 0, targetRotation: 0, enginePower: 0,
    hasShield: false, shieldTime: 0,
    shieldDuration: 8, shieldRadius: 0
};
let asteroids = [];
let shields = [];
let debris = [];
let score = 0;
let highScore = localStorage.getItem('hyperDodgerHighScore') || 0;
let gameRunning = false;
let animationId;
let targetX = null;
let targetY = null;
let spawnRate = 60;
let frames = 0;
let explosionParticles = [];
let shieldParticles = [];

// Инициализация игрока
function initPlayer() {
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.isExploding = false;
    player.explosionProgress = 0;
    player.velocityX = 0;
    player.velocityY = 0;
    player.rotation = 0;
    player.targetRotation = 0;
    player.enginePower = 0;
    player.hasShield = false;
    player.shieldTime = 0;
    player.shieldRadius = 0;
    explosionParticles = [];
    shieldParticles = [];
    shields = [];
    asteroids = [];
    debris = [];
}

// Создание частиц взрыва
function createExplosionParticles(x, y, count = 50, isShieldExplosion = false) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (isShieldExplosion ? 2 : 3) + 1;
        const size = Math.random() * (isShieldExplosion ? 3 : 4) + 2;
        
        explosionParticles.push({
            x: x, y: y,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            size: size,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01,
            color: isShieldExplosion ? 
                ['#00FFFF', '#0080FF'][Math.floor(Math.random() * 2)] :
                ['#FF0000', '#FF5500', '#FFFF00'][Math.floor(Math.random() * 3)]
        });
    }
}

// Создание осколков
function createAsteroidDebris(a) {
    const debrisCount = Math.floor(a.radius / 4) + 5;
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        const size = Math.random() * 8 + 4;
        
        debris.push({
            x: a.x, y: a.y,
            speedX: Math.cos(angle) * speed + a.speedX * 0.5,
            speedY: Math.sin(angle) * speed + a.speedY * 0.5,
            size: size,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            color: a.color,
            life: 1.0, decay: 0.02
        });
    }
}

// Обновление осколков
function updateDebris() {
    for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.speedX;
        d.y += d.speedY;
        d.rotation += d.rotationSpeed;
        d.life -= d.decay;
        d.speedX *= 0.98;
        d.speedY *= 0.98;
        if (d.life <= 0) debris.splice(i, 1);
    }
}

// Отрисовка осколков
function drawDebris() {
    debris.forEach(d => {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);
        ctx.globalAlpha = d.life;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

// Создание щита-бонуса
function createShieldBonus() {
    if (player.hasShield || shields.length > 0) return;
    
    const radius = 15;
    let x, y;
    let attempts = 0;
    let tooClose = true;
    
    while (tooClose && attempts < 20) {
        x = Math.random() * (canvas.width - radius * 2) + radius;
        y = Math.random() * (canvas.height - radius * 2) + radius;
        const distanceToPlayer = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2));
        tooClose = distanceToPlayer < 200;
        attempts++;
    }
    
    shields.push({
        x: x, y: y, radius: radius,
        rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.02,
        pulse: 0, pulseSpeed: 0.03,
        collected: false, lifetime: 450
    });
}

// Создание астероида
function createAsteroid() {
    const radius = Math.random() * 25 + 20;
    let x, y;
    
    const side = Math.floor(Math.random() * 4);
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -radius; break;
        case 1: x = canvas.width + radius; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + radius; break;
        case 3: x = -radius; y = Math.random() * canvas.height; break;
    }
    
    const targetX = canvas.width * (0.3 + Math.random() * 0.4);
    const targetY = canvas.height * (0.3 + Math.random() * 0.4);
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.random() * 1.5 + 0.8 + score / 2500;
    
    asteroids.push({
        x, y, radius,
        speedX: (dx / distance) * speed,
        speedY: (dy / distance) * speed,
        color: `hsl(${Math.random() * 30 + 10}, 70%, 40%)`,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04
    });
}

// Управление
canvas.addEventListener('touchstart', handleInputStart);
canvas.addEventListener('touchmove', handleInputMove);
canvas.addEventListener('touchend', handleInputEnd);
canvas.addEventListener('mousedown', handleInputStart);
canvas.addEventListener('mousemove', handleInputMove);
canvas.addEventListener('mouseup', handleInputEnd);
canvas.addEventListener('mouseleave', handleInputEnd);

function handleInputStart(e) {
    e.preventDefault();
    setTargetPosition(e);
}

function handleInputMove(e) {
    if (!gameRunning) return;
    e.preventDefault();
    setTargetPosition(e);
}

function handleInputEnd(e) {
    e.preventDefault();
    targetX = null;
    targetY = null;
    player.enginePower = 0;
}

function setTargetPosition(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.type.includes('touch')) {
        const touch = e.touches[0];
        targetX = touch.clientX - rect.left;
        targetY = touch.clientY - rect.top;
    } else {
        targetX = e.clientX - rect.left;
        targetY = e.clientY - rect.top;
    }
}

// Обновление игры
function update() {
    if (!gameRunning) return;
    if (player.isExploding) {
        updateExplosion();
        return;
    }

    // Движение игрока
    if (targetX !== null && targetY !== null) {
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        player.velocityX = dx / 8;
        player.velocityY = dy / 8;
        if (distance > 5) {
            player.targetRotation = Math.atan2(dy, dx) + Math.PI / 2;
            player.enginePower = Math.min(1, distance / 100);
        } else {
            player.enginePower *= 0.9;
        }
        player.x += player.velocityX;
        player.y += player.velocityY;
    } else {
        player.velocityX *= 0.95;
        player.velocityY *= 0.95;
        player.x += player.velocityX;
        player.y += player.velocityY;
        player.enginePower *= 0.9;
    }

    // Плавный поворот
    let angleDiff = player.targetRotation - player.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    player.rotation += angleDiff * 0.1;

    // Щит игрока
    if (player.hasShield) {
        player.shieldTime += 1/60;
        player.shieldRadius = player.radius + 15 + Math.sin(frames * 0.1) * 5;
        if (player.shieldTime >= player.shieldDuration) {
            player.hasShield = false;
            player.shieldTime = 0;
            player.shieldRadius = 0;
        }
    }

    // Границы экрана
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // Обновление осколков
    updateDebris();

    // Создание астероидов
    frames++;
    const currentSpawnRate = Math.max(25, spawnRate - Math.floor(score / 100));
    if (frames % currentSpawnRate === 0) createAsteroid();
    
    // Создание щитов
    if (frames % (60 * 20) === 0 && shields.length === 0 && !player.hasShield) {
        createShieldBonus();
    }

    // Обновление щитов-бонусов
    for (let i = shields.length - 1; i >= 0; i--) {
        const s = shields[i];
        if (!s.collected) {
            s.rotation += s.rotationSpeed;
            s.pulse += s.pulseSpeed;
            s.lifetime -= 1;
            if (s.lifetime <= 0) {
                shields.splice(i, 1);
                continue;
            }
            const dx = s.x - player.x;
            const dy = s.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < s.radius + player.radius) {
                s.collected = true;
                player.hasShield = true;
                player.shieldTime = 0;
                createExplosionParticles(s.x, s.y, 20, true);
                setTimeout(() => {
                    const index = shields.indexOf(s);
                    if (index > -1) shields.splice(index, 1);
                }, 500);
            }
        }
    }

    // Обновление астероидов
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        a.x += a.speedX;
        a.y += a.speedY;
        a.rotation += a.rotationSpeed;

        if (a.x < -a.radius - 150 || a.x > canvas.width + a.radius + 150 ||
            a.y < -a.radius - 150 || a.y > canvas.height + a.radius + 150) {
            asteroids.splice(i, 1);
            continue;
        }

        if (!player.isExploding) {
            const dx = a.x - player.x;
            const dy = a.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (player.hasShield) {
                if (distance < a.radius + player.radius + (player.shieldRadius || 0) * 0.8) {
                    createExplosionParticles(a.x, a.y, 25, true);
                    createAsteroidDebris(a);
                    score += 25;
                    asteroids.splice(i, 1);
                    continue;
                }
            } else {
                if (distance < a.radius + player.radius) {
                    player.isExploding = true;
                    createExplosionParticles(player.x, player.y);
                    return;
                }
            }
        }
    }

    score += 1;
    scoreElement.textContent = `Очки: ${score}`;
}

// Отрисовка игры
function draw() {
    // Фон
    ctx.fillStyle = '#000515';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Звезды
    if (!window.starfield) {
        window.starfield = [];
        for (let i = 0; i < 100; i++) {
            window.starfield.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2,
                brightness: Math.random() * 0.5 + 0.3
            });
        }
    }
    window.starfield.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Осколки
    drawDebris();

    // Астероиды
    asteroids.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rotation);
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Детали астероида
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(-5, -5, a.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Щиты-бонусы
    shields.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        const pulse = 1 + Math.sin(s.pulse) * 0.3;
        ctx.globalAlpha = s.lifetime / 450;
        ctx.fillStyle = 'rgba(0, 200, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, s.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
    });

    // Щит игрока
    if (player.hasShield) {
        const pulse = Math.sin(frames * 0.1) * 0.1 + 0.9;
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.shieldRadius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.shieldRadius * pulse * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Взрыв
    if (player.isExploding) {
        explosionParticles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        if (player.explosionProgress < 1) {
            ctx.globalAlpha = 1 - player.explosionProgress;
            ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius * (1 + player.explosionProgress * 3), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    } else {
        // Корабль
        drawShip(player.x, player.y, player.radius, player.rotation, player.enginePower);
    }
}

// Отрисовка корабля
function drawShip(x, y, radius, rotation, enginePower) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Корпус
    ctx.fillStyle = '#4cc9f0';
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(-radius * 0.7, radius * 0.7);
    ctx.lineTo(radius * 0.7, radius * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Кабина
    ctx.fillStyle = '#a8dadc';
    ctx.beginPath();
    ctx.arc(0, -radius * 0.3, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Двигатель
    if (enginePower > 0.1) {
        ctx.fillStyle = `rgba(255, 100, 0, ${enginePower * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, radius * 0.7);
        ctx.lineTo(0, radius * (0.7 + enginePower));
        ctx.lineTo(radius * 0.4, radius * 0.7);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// Обновление взрыва
function updateExplosion() {
    player.explosionProgress += 0.03;
    if (player.explosionProgress >= 1) {
        player.explosionProgress = 1;
    }
    
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= p.decay;
        p.speedX *= 0.98;
        p.speedY *= 0.98;
        if (p.life <= 0) explosionParticles.splice(i, 1);
    }
    
    if (player.explosionProgress >= 1 && explosionParticles.length === 0) {
        gameOver();
    }
}

// Игровой цикл
function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// Завершение игры
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('hyperDodgerHighScore', highScore);
        highScoreElement.textContent = `Рекорд: ${highScore}`;
    }
    
    finalScoreElement.textContent = score;
    setTimeout(() => {
        gameOverScreen.style.display = 'flex';
    }, 1000);
}

// Начало игры
function startGame() {
    initPlayer();
    score = 0;
    frames = 0;
    spawnRate = 60;
    gameRunning = true;
    
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    scoreElement.textContent = `Очки: ${score}`;
    highScoreElement.textContent = `Рекорд: ${highScore}`;
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    resizeCanvas();
    gameLoop();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log("Игра загружается...");
    
    // Обработчики кнопок
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', startGame);
    
    // Инициализация
    resizeCanvas();
    initPlayer();
    
    // Обновляем рекорд
    highScoreElement.textContent = `Рекорд: ${highScore}`;
    
    console.log("Игра готова к запуску!");
});

// Глобальная функция для кнопок
window.startGame = startGame;
