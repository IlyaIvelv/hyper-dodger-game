// game.js - ГИПЕР-УВОРАЧИВАТЕЛЬ (исправленная версия)

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
    radius: 20,
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
    shieldDuration: 10, // 10 секунд щита
    shieldRadius: 0
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
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);

// ===== ИНИЦИАЛИЗАЦИЯ ИГРОКА =====
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
    shields = [];
    asteroids = [];
    debris = [];
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
    
    const radius = 15;
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

// ===== СОЗДАНИЕ АСТЕРОИДА С ВРАЩЕНИЕМ =====
// ===== СОЗДАНИЕ АСТЕРОИДА С ВРАЩЕНИЕМ (МЕДЛЕННЕЕ) =====
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
    
    // ЗАМЕДЛЕННАЯ СКОРОСТЬ АСТЕРОИДОВ:
    // Было: Math.random() * 1.5 + 0.8 + score / 2500
    // Стало: медленнее в начале, медленнее растет со счетом
    const baseSpeed = Math.random() * 1.0 + 0.5; // Медленнее базовая скорость
    const scoreBonus = score / 5000; // Медленнее рост со счетом
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
        player.shieldRadius = player.radius + 15 + Math.sin(frames * 0.1) * 5;
        
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
    
    // Создание астероидов
    frames++;
    const currentSpawnRate = Math.max(35, spawnRate - Math.floor(score / 150));
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
    for (let i = 0; i < 100; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 41) % canvas.height;
        const size = Math.sin(frames * 0.01 + i) * 0.5 + 0.5;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
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
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius * pulseFactor, 0, Math.PI * 2);
        ctx.stroke();
        
        // Символ щита
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${s.radius * 1.2}px Arial`;
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
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, shieldRadius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Внутренний контур
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.lineWidth = 1;
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
        // Отрисовка корабля (СТАРЫЙ ВИД)
        drawOriginalShip(player.x, player.y, player.radius, player.rotation, player.enginePower);
    }
}

// ===== ОТРИСОВКА СТАРОГО КОРАБЛЯ (С МАЛЕНЬКИМ ОГНЬКОМ) =====
function drawOriginalShip(x, y, radius, rotation, enginePower) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const scale = 0.6;
    const scaledRadius = radius * scale;
    
    // Корпус корабля (эллиптический)
    const bodyGradient = ctx.createLinearGradient(
        -scaledRadius * 0.8, 0,
        scaledRadius * 0.8, 0
    );
    bodyGradient.addColorStop(0, '#2a6b9c');
    bodyGradient.addColorStop(0.5, '#4cc9f0');
    bodyGradient.addColorStop(1, '#2a6b9c');
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, scaledRadius * 0.8, scaledRadius * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Боковые панели
    ctx.fillStyle = 'rgba(42, 107, 156, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-scaledRadius * 0.6, 0, scaledRadius * 0.3, scaledRadius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(scaledRadius * 0.6, 0, scaledRadius * 0.3, scaledRadius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Кабина
    const cockpitGradient = ctx.createRadialGradient(
        0, -scaledRadius * 0.3, 0,
        0, -scaledRadius * 0.3, scaledRadius * 0.6
    );
    cockpitGradient.addColorStop(0, '#a8dadc');
    cockpitGradient.addColorStop(1, '#457b9d');
    
    ctx.fillStyle = cockpitGradient;
    ctx.beginPath();
    ctx.arc(0, -scaledRadius * 0.3, scaledRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Стекло кабины
    const glassGradient = ctx.createRadialGradient(
        0, -scaledRadius * 0.3, 0,
        0, -scaledRadius * 0.3, scaledRadius * 0.45
    );
    glassGradient.addColorStop(0, 'rgba(168, 218, 220, 0.9)');
    glassGradient.addColorStop(1, 'rgba(69, 123, 157, 0.4)');
    
    ctx.fillStyle = glassGradient;
    ctx.beginPath();
    ctx.arc(0, -scaledRadius * 0.3, scaledRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    
    // Окна кабины
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-scaledRadius * 0.1, -scaledRadius * 0.4, scaledRadius * 0.1, scaledRadius * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Крылья
    ctx.fillStyle = '#3a86ff';
    ctx.beginPath();
    ctx.moveTo(-scaledRadius * 0.8, scaledRadius * 0.2);
    ctx.lineTo(-scaledRadius * 1.3, scaledRadius * 0.7);
    ctx.lineTo(-scaledRadius * 0.8, scaledRadius * 0.7);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(scaledRadius * 0.8, scaledRadius * 0.2);
    ctx.lineTo(scaledRadius * 1.3, scaledRadius * 0.7);
    ctx.lineTo(scaledRadius * 0.8, scaledRadius * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // МАЛЕНЬКИЙ ОГОНЁК ДВИГАТЕЛЯ (как раньше)
    if (enginePower > 0.1) {
        // Маленький размер огонька
        const engineLength = scaledRadius * 0.8 * enginePower; // Уменьшили в 2 раза
        const engineWidth = scaledRadius * 0.4; // Уменьшили ширину
        
        // Градиент огня (менее яркий)
        const engineGradient = ctx.createLinearGradient(
            0, -engineWidth/2,
            0, engineWidth/2
        );
        engineGradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)'); // Более прозрачный
        engineGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.6)'); // Желтый вместо ярко-желтого
        engineGradient.addColorStop(1, 'rgba(255, 100, 0, 0.8)');
        
        ctx.fillStyle = engineGradient;
        ctx.globalAlpha = 0.6 * enginePower; // Меньшая прозрачность
        ctx.beginPath();
        ctx.moveTo(0, -engineWidth/2);
        ctx.lineTo(-engineLength, 0);
        ctx.lineTo(0, engineWidth/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1;
        
        // Добавляем маленькие искры
        if (Math.random() < 0.3) {
            ctx.fillStyle = '#ffff00';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            const sparkX = -engineLength * 0.8;
            const sparkY = (Math.random() - 0.5) * engineWidth * 0.5;
            const sparkSize = Math.random() * 2 + 1;
            ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    
    ctx.restore();
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

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Дополнительное замедление для мобильных
if (isMobileDevice()) {
    console.log("Мобильное устройство - дополнительное замедление астероидов");
    
    // Переопределяем скорость для мобильных
    const originalCreateAsteroid = createAsteroid;
    createAsteroid = function() {
        const asteroid = originalCreateAsteroid();
        const lastIndex = asteroids.length - 1;
        
        if (lastIndex >= 0) {
            // Дополнительно замедляем астероиды на мобильных
            asteroids[lastIndex].speedX *= 0.8;
            asteroids[lastIndex].speedY *= 0.8;
        }
        
        return asteroid;
    };
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


