// game.js - ГИПЕР-УВОРАЧИВАТЕЛЬ (полная версия с исправлениями)

// ===== ЭЛЕМЕНТЫ DOM =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const recordMessage = document.getElementById('recordMessage');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

// Создаем элемент для таймера щита
const shieldTimer = document.createElement('div');
shieldTimer.id = 'shieldTimer';
document.body.appendChild(shieldTimer);

// ===== ИГРОВЫЕ ПЕРЕМЕННЫЕ =====
let player = { 
    x: 0, y: 0, 
    radius: 25, 
    color: '#4cc9f0', 
    isExploding: false, 
    explosionProgress: 0,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    targetRotation: 0,
    enginePower: 0,
    hasShield: false,
    shieldTime: 0,
    shieldDuration: 10,
    shieldRadius: 0,
    engineFlame: [] // Массив для частиц огня
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

// ===== УСТАНОВКА РАЗМЕРА КАНВАСА =====
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

// ===== ИНИЦИАЛИЗАЦИЯ ИГРОКА =====
function initPlayer() {
    player.x = canvas.width / 2;
    player.y = canvas.height - 150;
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
    player.engineFlame = []; // Очищаем огонь
    explosionParticles = [];
    shields = [];
    asteroids = [];
    debris = [];
}

// ===== СОЗДАНИЕ ЧАСТИЦ ОГНЯ ДЛЯ ДВИГАТЕЛЯ =====
function createEngineFlame() {
    if (player.enginePower > 0.1 && gameRunning && !player.isExploding) {
        // Создаем частицы огня
        for (let i = 0; i < 3; i++) {
            const angle = player.rotation - Math.PI; // Направление назад от корабля
            const speedVariation = (Math.random() - 0.5) * 0.5;
            const angleVariation = (Math.random() - 0.5) * 0.3;
            
            player.engineFlame.push({
                x: player.x - Math.cos(player.rotation) * player.radius * 1.2,
                y: player.y - Math.sin(player.rotation) * player.radius * 1.2,
                speedX: Math.cos(angle + angleVariation) * (3 + player.enginePower * 2 + speedVariation),
                speedY: Math.sin(angle + angleVariation) * (3 + player.enginePower * 2 + speedVariation),
                size: Math.random() * 6 + 4,
                life: 1.0,
                decay: 0.05 + Math.random() * 0.03,
                color: ['#FF5500', '#FFAA00', '#FFFF00'][Math.floor(Math.random() * 3)]
            });
        }
    }
}

// ===== ОБНОВЛЕНИЕ ЧАСТИЦ ОГНЯ =====
function updateEngineFlame() {
    for (let i = player.engineFlame.length - 1; i >= 0; i--) {
        const p = player.engineFlame[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= p.decay;
        p.speedX *= 0.95;
        p.speedY *= 0.95;
        p.size *= 0.97;
        
        if (p.life <= 0) {
            player.engineFlame.splice(i, 1);
        }
    }
    
    // Ограничиваем количество частиц
    if (player.engineFlame.length > 100) {
        player.engineFlame.splice(0, player.engineFlame.length - 100);
    }
}

// ===== СОЗДАНИЕ ОСКОЛКОВ АСТЕРОИДА =====
function createAsteroidDebris(a) {
    const debrisCount = Math.floor(a.radius / 4) + 5;
    
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        const size = Math.random() * 8 + 4;
        const rotationSpeed = (Math.random() - 0.5) * 0.1;
        
        debris.push({
            x: a.x,
            y: a.y,
            speedX: Math.cos(angle) * speed + a.speedX * 0.5,
            speedY: Math.sin(angle) * speed + a.speedY * 0.5,
            size: size,
            rotation: 0,
            rotationSpeed: rotationSpeed,
            color: a.color,
            life: 1.0,
            decay: 0.02
        });
    }
}

// ===== ОБНОВЛЕНИЕ ОСКОЛКОВ =====
function updateDebris() {
    for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.speedX;
        d.y += d.speedY;
        d.rotation += d.rotationSpeed;
        d.life -= d.decay;
        d.speedX *= 0.98;
        d.speedY *= 0.98;
        
        if (d.life <= 0) {
            debris.splice(i, 1);
        }
    }
}

// ===== СОЗДАНИЕ ЩИТА-БОНУСА =====
function createShieldBonus() {
    if (player.hasShield || shields.length > 0) return;
    
    const radius = 20;
    let x = Math.random() * (canvas.width - radius * 2) + radius;
    let y = Math.random() * (canvas.height - radius * 2) + radius;
    
    shields.push({
        x: x,
        y: y,
        radius: radius,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        pulse: 0,
        pulseSpeed: 0.03,
        collected: false,
        lifetime: 450
    });
}

// ===== СОЗДАНИЕ АСТЕРОИДА С ВРАЩЕНИЕМ (МЕДЛЕННО) =====
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
    
    // МЕДЛЕННАЯ СКОРОСТЬ АСТЕРОИДОВ
    const baseSpeed = Math.random() * 0.8 + 0.4; // Медленная базовая скорость
    const scoreBonus = score / 8000; // Очень медленный рост со счетом
    const speed = baseSpeed + scoreBonus;
    
    const rotationSpeed = (Math.random() - 0.5) * 0.04;
    const hue = Math.random() * 30 + 10;
    const color = `hsl(${hue}, 70%, 40%)`;
    
    const spikes = 7 + Math.floor(Math.random() * 6);
    const spikeLengths = [];
    for (let i = 0; i < spikes; i++) {
        spikeLengths.push(radius * (0.7 + Math.random() * 0.6));
    }
    
    asteroids.push({
        x, y, radius,
        speedX: (dx / distance) * speed,
        speedY: (dy / distance) * speed,
        color: color,
        spikes: spikes,
        spikeLengths: spikeLengths,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: rotationSpeed
    });
}

// ===== УПРАВЛЕНИЕ =====
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

// ===== ОБНОВЛЕНИЕ ИГРЫ =====
function update() {
    if (!gameRunning) return;
    if (player.isExploding) {
        updateExplosion();
        return;
    }
    
    // Создаем и обновляем огонь
    createEngineFlame();
    updateEngineFlame();
    
    // Движение игрока к цели
    const speed = 8;
    if (targetX !== null && targetY !== null) {
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        player.velocityX = dx / speed;
        player.velocityY = dy / speed;
        
        // Поворот корабля в направлении движения
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
    
    // Плавный поворот корабля
    let angleDiff = player.targetRotation - player.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    player.rotation += angleDiff * 0.1;
    
    // Обновление щита игрока
    if (player.hasShield) {
        player.shieldTime += 1/60;
        player.shieldRadius = player.radius + 20 + Math.sin(frames * 0.1) * 5;
        
        // Показываем таймер щита
        const remainingTime = Math.max(0, player.shieldDuration - player.shieldTime);
        shieldTimer.textContent = `Щит: ${remainingTime.toFixed(1)}с`;
        shieldTimer.style.display = 'block';
        
        if (player.shieldTime >= player.shieldDuration) {
            player.hasShield = false;
            player.shieldTime = 0;
            player.shieldRadius = 0;
            shieldTimer.style.display = 'none';
        }
    } else {
        shieldTimer.style.display = 'none';
    }
    
    // Удерживаем игрока в пределах экрана
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    
    // Обновление осколков
    updateDebris();
    
    // Создание астероидов (реже)
    frames++;
    const currentSpawnRate = Math.max(50, spawnRate - Math.floor(score / 200));
    if (frames % currentSpawnRate === 0) {
        createAsteroid();
        
        if (score > 300 && Math.random() < 0.25) {
            setTimeout(() => createAsteroid(), 100);
        }
    }
    
    // Создание щитов (редко)
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
                
                setTimeout(() => {
                    const index = shields.indexOf(s);
                    if (index > -1) {
                        shields.splice(index, 1);
                    }
                }, 500);
            }
        }
    }
    
    // Обновление астероидов
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        
        // Движение и вращение
        a.x += a.speedX;
        a.y += a.speedY;
        a.rotation += a.rotationSpeed;
        
        // Удаление вышедших за экран
        const margin = 150;
        if (a.x < -a.radius - margin || a.x > canvas.width + a.radius + margin ||
            a.y < -a.radius - margin || a.y > canvas.height + a.radius + margin) {
            asteroids.splice(i, 1);
            continue;
        }
        
        // Проверка столкновений
        if (!player.isExploding) {
            const dx = a.x - player.x;
            const dy = a.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (player.hasShield) {
                // Столкновение со щитом - астероид разваливается!
                if (distance < a.radius + player.radius + player.shieldRadius * 0.8) {
                    createAsteroidDebris(a);
                    score += 25;
                    asteroids.splice(i, 1);
                    continue;
                }
            } else {
                // Обычное столкновение
                if (distance < a.radius + player.radius) {
                    player.isExploding = true;
                    createExplosionParticles();
                    return;
                }
            }
        }
    }
    
    score += 1;
    scoreElement.textContent = `Очки: ${score}`;
}

// ===== СОЗДАНИЕ ЧАСТИЦ ВЗРЫВА =====
function createExplosionParticles() {
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const size = Math.random() * 4 + 2;
        
        explosionParticles.push({
            x: player.x,
            y: player.y,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            size: size,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01,
            color: ['#FF0000', '#FF5500', '#FFFF00'][Math.floor(Math.random() * 3)]
        });
    }
}

// ===== ОБНОВЛЕНИЕ ВЗРЫВА =====
function updateExplosion() {
    player.explosionProgress += 0.03;
    
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= p.decay;
        p.speedX *= 0.98;
        p.speedY *= 0.98;
        
        if (p.life <= 0) {
            explosionParticles.splice(i, 1);
        }
    }
    
    if (player.explosionProgress >= 1 && explosionParticles.length === 0) {
        gameOver();
    }
}

// ===== ОТРИСОВКА ИГРЫ =====
function draw() {
    // Космический фон
    ctx.fillStyle = '#000515';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Звёзды
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 150; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 41) % canvas.height;
        const size = Math.sin(frames * 0.01 + i) * 0.5 + 0.5;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Огонь из двигателя (частицы)
    player.engineFlame.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // Осколки астероидов
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
    
    // Астероиды с вращением
    asteroids.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rotation);
        
        // Отрисовка неровного астероида
        ctx.fillStyle = a.color;
        ctx.beginPath();
        
        const spikes = a.spikes;
        for (let i = 0; i < spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            const spikeLength = a.spikeLengths[i];
            const x = Math.cos(angle) * spikeLength;
            const y = Math.sin(angle) * spikeLength;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Тень для объема
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        for (let i = 0; i < spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            const spikeLength = a.spikeLengths[i] * 0.9;
            const x = Math.cos(angle) * spikeLength - 3;
            const y = Math.sin(angle) * spikeLength - 3;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Кратеры
        ctx.fillStyle = 'rgba(70, 35, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(-a.radius * 0.3, -a.radius * 0.2, a.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
    
    // Щиты-бонусы
    shields.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        
        const pulseFactor = 1 + Math.sin(s.pulse) * 0.3;
        const lifeRatio = s.lifetime / 450;
        ctx.globalAlpha = lifeRatio;
        
        // Голубое свечение
        ctx.fillStyle = 'rgba(0, 200, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, s.radius * pulseFactor, 0, Math.PI * 2);
        ctx.fill();
        
        // Контур
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius * pulseFactor, 0, Math.PI * 2);
        ctx.stroke();
        
        // Символ щита
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${s.radius * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', 0, 0);
        
        ctx.restore();
        ctx.globalAlpha = 1;
    });
    
    // Щит игрока
    if (player.hasShield) {
        const shieldRadius = player.shieldRadius;
        const pulse = Math.sin(frames * 0.1) * 0.1 + 0.9;
        
        // Внешнее свечение
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, shieldRadius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Внутренний контур
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(player.x, player.y, shieldRadius * 0.8 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Взрыв игрока
    if (player.isExploding) {
        // Частицы взрыва
        explosionParticles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Центр взрыва
        ctx.fillStyle = `rgba(255, 100, 0, ${0.7 - player.explosionProgress * 0.7})`;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * (1 + player.explosionProgress * 3), 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Отрисовка БОЛЬШОЙ РАКЕТЫ С ОГНЁМ
        drawBigRocket(player.x, player.y, player.radius, player.rotation, player.enginePower);
    }
}

// ===== ОТРИСОВКА БОЛЬШОЙ РАКЕТЫ С ОГНЁМ =====
// ===== ОТРИСОВКА РАКЕТЫ С ОГНЁМ СЗАДИ =====
function drawBigRocket(x, y, radius, rotation, enginePower) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const scale = 0.65;
    const scaledRadius = radius * scale;
    
    // Корпус ракеты
    const bodyGradient = ctx.createLinearGradient(
        -scaledRadius * 0.9, 0,
        scaledRadius * 0.9, 0
    );
    bodyGradient.addColorStop(0, '#1a5b8c');
    bodyGradient.addColorStop(0.3, '#4cc9f0');
    bodyGradient.addColorStop(0.7, '#4cc9f0');
    bodyGradient.addColorStop(1, '#1a5b8c');
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    
    // Форма ракеты
    ctx.moveTo(0, -scaledRadius * 1.4);
    ctx.bezierCurveTo(
        scaledRadius * 0.6, -scaledRadius * 1.1,
        scaledRadius * 0.9, -scaledRadius * 0.3,
        scaledRadius * 0.7, scaledRadius * 1.0
    );
    ctx.lineTo(-scaledRadius * 0.7, scaledRadius * 1.0);
    ctx.bezierCurveTo(
        -scaledRadius * 0.9, -scaledRadius * 0.3,
        -scaledRadius * 0.6, -scaledRadius * 1.1,
        0, -scaledRadius * 1.4
    );
    
    ctx.closePath();
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Кабина
    const cockpitGradient = ctx.createRadialGradient(
        0, -scaledRadius * 0.7, 0,
        0, -scaledRadius * 0.7, scaledRadius * 0.7
    );
    cockpitGradient.addColorStop(0, '#c8eafc');
    cockpitGradient.addColorStop(0.5, '#7bc8f0');
    cockpitGradient.addColorStop(1, '#2a6b9c');
    
    ctx.fillStyle = cockpitGradient;
    ctx.beginPath();
    ctx.arc(0, -scaledRadius * 0.7, scaledRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Стекло
    const glassGradient = ctx.createRadialGradient(
        -scaledRadius * 0.15, -scaledRadius * 0.75, 0,
        0, -scaledRadius * 0.7, scaledRadius * 0.5
    );
    glassGradient.addColorStop(0, 'rgba(200, 234, 252, 0.9)');
    glassGradient.addColorStop(0.7, 'rgba(123, 200, 240, 0.6)');
    glassGradient.addColorStop(1, 'rgba(42, 107, 156, 0.3)');
    
    ctx.fillStyle = glassGradient;
    ctx.beginPath();
    ctx.arc(0, -scaledRadius * 0.7, scaledRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Пилот
    ctx.fillStyle = 'rgba(30, 30, 50, 0.8)';
    ctx.beginPath();
    ctx.arc(0, -scaledRadius * 0.7, scaledRadius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Крылья
    ctx.fillStyle = '#2a6b9c';
    ctx.beginPath();
    ctx.moveTo(-scaledRadius * 0.5, -scaledRadius * 0.15);
    ctx.lineTo(-scaledRadius * 1.2, scaledRadius * 0.25);
    ctx.lineTo(-scaledRadius * 0.6, scaledRadius * 0.7);
    ctx.lineTo(-scaledRadius * 0.3, scaledRadius * 0.4);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(scaledRadius * 0.5, -scaledRadius * 0.15);
    ctx.lineTo(scaledRadius * 1.2, scaledRadius * 0.25);
    ctx.lineTo(scaledRadius * 0.6, scaledRadius * 0.7);
    ctx.lineTo(scaledRadius * 0.3, scaledRadius * 0.4);
    ctx.closePath();
    ctx.fill();
    
    // Стабилизаторы
    ctx.fillStyle = '#3a86ff';
    ctx.beginPath();
    ctx.moveTo(-scaledRadius * 0.25, scaledRadius * 0.8);
    ctx.lineTo(-scaledRadius * 0.6, scaledRadius * 1.1);
    ctx.lineTo(-scaledRadius * 0.1, scaledRadius * 1.1);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(scaledRadius * 0.25, scaledRadius * 0.8);
    ctx.lineTo(scaledRadius * 0.6, scaledRadius * 1.1);
    ctx.lineTo(scaledRadius * 0.1, scaledRadius * 1.1);
    ctx.closePath();
    ctx.fill();
    
    // Двигатель сзади
    ctx.fillStyle = '#444444';
    ctx.beginPath();
    ctx.ellipse(0, scaledRadius * 1.0, scaledRadius * 0.4, scaledRadius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // ОГОНЬ ИЗ ДВИГАТЕЛЯ - СТРОГО СЗАДИ
    if (enginePower > 0.1) {
        // Сохраняем трансформацию для огня
        ctx.save();
        
        // Огонь рисуем относительно задней части
        ctx.translate(0, scaledRadius * 1.0);
        ctx.rotate(Math.PI); // Направляем назад
        
        const flameLength = scaledRadius * 2.0 * enginePower;
        const flameWidth = scaledRadius * 0.7;
        
        // Градиент огня
        const flameGradient = ctx.createLinearGradient(
            0, -flameWidth/2,
            0, flameWidth/2
        );
        flameGradient.addColorStop(0, '#FFFF00');
        flameGradient.addColorStop(0.3, '#FFAA00');
        flameGradient.addColorStop(0.7, '#FF5500');
        flameGradient.addColorStop(1, '#FF0000');
        
        ctx.fillStyle = flameGradient;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, -flameWidth/2);
        ctx.lineTo(-flameLength, 0);
        ctx.lineTo(0, flameWidth/2);
        ctx.closePath();
        ctx.fill();
        
        // Внешнее свечение
        ctx.fillStyle = 'rgba(255, 150, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, -flameWidth/1.3);
        ctx.lineTo(-flameLength * 1.3, 0);
        ctx.lineTo(0, flameWidth/1.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Искры
        ctx.fillStyle = '#FFFF00';
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 3; i++) {
            const sparkX = Math.cos(Math.PI + (Math.random() - 0.5) * 0.2) * flameLength * (0.3 + Math.random() * 0.7);
            const sparkY = scaledRadius * 1.0 + Math.sin(Math.PI + (Math.random() - 0.5) * 0.2) * flameLength * (0.3 + Math.random() * 0.7);
            const sparkSize = Math.random() * 1.5 + 1;
            
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    // Детали
    ctx.fillStyle = '#3a86ff';
    ctx.beginPath();
    ctx.rect(-scaledRadius * 0.15, -scaledRadius * 0.3, scaledRadius * 0.3, scaledRadius * 0.15);
    ctx.fill();
    
    ctx.restore();
}

// ===== СОЗДАНИЕ ЧАСТИЦ ОГНЯ ДЛЯ ДВИГАТЕЛЯ (СЗАДИ) =====
function createEngineFlame() {
    if (player.enginePower > 0.1 && gameRunning && !player.isExploding) {
        // Координаты задней части ракеты
        const rearX = player.x - Math.cos(player.rotation) * player.radius * 0.9;
        const rearY = player.y - Math.sin(player.rotation) * player.radius * 0.9;
        
        // Создаем частицы огня СЗАДИ ракеты
        for (let i = 0; i < 2; i++) {
            const angle = player.rotation - Math.PI; // Направление строго назад
            const speedVariation = (Math.random() - 0.5) * 0.3;
            const angleVariation = (Math.random() - 0.5) * 0.2;
            
            player.engineFlame.push({
                x: rearX,
                y: rearY,
                speedX: Math.cos(angle + angleVariation) * (2 + player.enginePower * 1.5 + speedVariation),
                speedY: Math.sin(angle + angleVariation) * (2 + player.enginePower * 1.5 + speedVariation),
                size: Math.random() * 4 + 3,
                life: 1.0,
                decay: 0.04 + Math.random() * 0.02,
                color: ['#FF5500', '#FFAA00', '#FFFF00'][Math.floor(Math.random() * 3)]
            });
        }
    }
}

// ===== ИГРОВОЙ ЦИКЛ =====
function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// ===== ЗАВЕРШЕНИЕ ИГРЫ =====
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    let newRecord = false;
    
    // Обновление рекорда
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('hyperDodgerHighScore', highScore);
        highScoreElement.textContent = `Рекорд: ${highScore}`;
        newRecord = true;
    }
    
    // Показ экрана завершения
    finalScoreElement.textContent = score;
    
    // Сообщение о рекорде
    if (newRecord) {
        recordMessage.textContent = '🎉 НОВЫЙ РЕКОРД! 🎉';
    } else {
        recordMessage.textContent = `Рекорд: ${highScore}`;
    }
    
    // Показываем кнопку "Играть снова" сразу
    gameOverScreen.style.display = 'flex';
}

// ===== НАЧАЛО ИГРЫ =====
function startGame() {
    initPlayer();
    score = 0;
    frames = 0;
    spawnRate = 60;
    gameRunning = true;
    
    // Скрываем экраны
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    shieldTimer.style.display = 'none';
    
    // Обновляем счет
    scoreElement.textContent = `Очки: ${score}`;
    highScoreElement.textContent = `Рекорд: ${highScore}`;
    
    // Запускаем игровой цикл
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    resizeCanvas();
    gameLoop();
}

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
window.addEventListener('load', function() {
    // Устанавливаем размер канваса
    resizeCanvas();
    
    // Инициализируем игрока
    initPlayer();
    
    // Обновляем рекорд
    highScoreElement.textContent = `Рекорд: ${highScore}`;
    
    // Обработчики кнопок
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    
    // Делаем функцию глобальной
    window.startGame = startGame;
    
    console.log("🚀 Игра 'Гипер-уворачиватель' готова к запуску!");
});

// ===== ДОПОЛНИТЕЛЬНОЕ ЗАМЕДЛЕНИЕ ДЛЯ МОБИЛЬНЫХ =====
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Дополнительное замедление для мобильных
if (isMobileDevice()) {
    console.log("Мобильное устройство - замедление астероидов и уменьшение частоты");
    
    // Замедляем скорость астероидов
    const originalCreateAsteroid = createAsteroid;
    createAsteroid = function() {
        const asteroid = originalCreateAsteroid();
        const lastIndex = asteroids.length - 1;
        
        if (lastIndex >= 0) {
            // Дополнительно замедляем астероиды на мобильных
            asteroids[lastIndex].speedX *= 0.6; // БЫЛО 0.7
            asteroids[lastIndex].speedY *= 0.6; // БЫЛО 0.7
        }
        
        return asteroid;
    };
    
    // Увеличиваем интервал между астероидами на мобильных
    spawnRate = 80; // БОЛЬШЕ ЧИСЛО = РЕЖЕ АСТЕРОИДЫ
}



