// game.js
// Инициализация
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

// Устанавливаем размер канваса под экран
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Игровые переменные
let player = { 
    x: 0, 
    y: 0, 
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
    shieldDuration: 8,
    shieldRadius: 0
};
let asteroids = [];
let debris = []; // Осколки от разрушенных астероидов
let shields = [];
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
let lastPlayerX = 0;
let lastPlayerY = 0;

// Обновляем рекорд на экране
highScoreElement.textContent = `Рекорд: ${highScore}`;

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
    lastPlayerX = player.x;
    lastPlayerY = player.y;
    explosionParticles = [];
    shieldParticles = [];
    shields = [];
    asteroids = [];
    debris = [];
}

// Создание частиц взрыва
function createExplosionParticles(x, y, count = 50, isShieldExplosion = false) {
    const particleCount = count;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (isShieldExplosion ? 2 : 3) + 1;
        const size = Math.random() * (isShieldExplosion ? 3 : 4) + 2;
        const life = 1.0;
        
        explosionParticles.push({
            x: x,
            y: y,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            size: size,
            life: life,
            decay: Math.random() * 0.02 + 0.01,
            color: isShieldExplosion ? 
                ['#00FFFF', '#0080FF', '#4cc9f0'][Math.floor(Math.random() * 3)] :
                ['#FF0000', '#FF5500', '#FFFF00', '#4cc9f0'][Math.floor(Math.random() * 4)]
        });
    }
}

// Создание осколков от астероида
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
        
        if (d.life <= 0) {
            debris.splice(i, 1);
        }
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
        
        // Тень для объема
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(-2, -2, d.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

// Создание частиц щита
function createShieldParticles() {
    if (!player.hasShield) return;
    
    for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = player.radius + player.shieldRadius * 0.8;
        
        shieldParticles.push({
            x: player.x + Math.cos(angle) * distance,
            y: player.y + Math.sin(angle) * distance,
            angle: angle,
            distance: distance,
            speed: 0.02 + Math.random() * 0.02,
            size: 2 + Math.random() * 3,
            life: 1.0
        });
    }
    
    if (shieldParticles.length > 100) {
        shieldParticles.splice(0, shieldParticles.length - 100);
    }
}

// Обновление частиц щита
function updateShieldParticles() {
    for (let i = shieldParticles.length - 1; i >= 0; i--) {
        const p = shieldParticles[i];
        p.angle += p.speed;
        p.x = player.x + Math.cos(p.angle) * p.distance;
        p.y = player.y + Math.sin(p.angle) * p.distance;
        p.life -= 0.01;
        
        if (p.life <= 0) {
            shieldParticles.splice(i, 1);
        }
    }
}

// Обновление частиц взрыва
function updateExplosion() {
    if (!player.isExploding) return;
    
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
        
        if (p.life <= 0) {
            explosionParticles.splice(i, 1);
        }
    }
    
    if (player.explosionProgress >= 1 && explosionParticles.length === 0) {
        gameOver();
    }
}

// Отрисовка взрыва
function drawExplosion() {
    if (!player.isExploding) return;
    
    explosionParticles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.globalAlpha = 1;
    
    if (player.explosionProgress < 1) {
        const explosionRadius = player.radius * (1 + player.explosionProgress * 3);
        const gradient = ctx.createRadialGradient(
            player.x, player.y, 0,
            player.x, player.y, explosionRadius
        );
        gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.globalAlpha = 1 - player.explosionProgress;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, explosionRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
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
        
        const distanceToPlayer = Math.sqrt(
            Math.pow(x - player.x, 2) + 
            Math.pow(y - player.y, 2)
        );
        
        tooClose = distanceToPlayer < 200;
        attempts++;
    }
    
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

// Создание астероида с вращением
function createAsteroid() {
    const radius = Math.random() * 25 + 20;
    let x, y;
    
    const side = Math.floor(Math.random() * 4);
    switch(side) {
        case 0:
            x = Math.random() * canvas.width;
            y = -radius;
            break;
        case 1:
            x = canvas.width + radius;
            y = Math.random() * canvas.height;
            break;
        case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + radius;
            break;
        case 3:
            x = -radius;
            y = Math.random() * canvas.height;
            break;
    }
    
    const targetX = canvas.width * (0.3 + Math.random() * 0.4);
    const targetY = canvas.height * (0.3 + Math.random() * 0.4);
    
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const speed = Math.random() * 1.5 + 0.8 + score / 2500;
    
    const speedX = (dx / distance) * speed;
    const speedY = (dy / distance) * speed;
    
    const hue = Math.random() * 30 + 10;
    const saturation = 60 + Math.random() * 20;
    const lightness = 30 + Math.random() * 20;
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    const spikes = 7 + Math.floor(Math.random() * 6);
    const spikeLengths = [];
    for (let i = 0; i < spikes; i++) {
        spikeLengths.push(radius * (0.7 + Math.random() * 0.6));
    }

    const craters = [
        { relX: (Math.random() - 0.5) * 0.6, relY: (Math.random() - 0.5) * 0.6, size: Math.random() * 0.3 + 0.1 },
        { relX: (Math.random() - 0.5) * 0.6, relY: (Math.random() - 0.5) * 0.6, size: Math.random() * 0.3 + 0.1 },
        { relX: (Math.random() - 0.5) * 0.6, relY: (Math.random() - 0.5) * 0.6, size: Math.random() * 0.3 + 0.1 }
    ];

    const rotationSpeed = (Math.random() - 0.5) * 0.04;
    
    asteroids.push({
        x, y, radius,
        speedX: speedX,
        speedY: speedY,
        color: color,
        spikes: spikes,
        spikeLengths: spikeLengths,
        craters: craters,
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

// Обновление игры
function update() {
    if (!gameRunning) return;

    if (player.isExploding) {
        updateExplosion();
        return;
    }

    lastPlayerX = player.x;
    lastPlayerY = player.y;

    // Движение игрока
    const speed = 8;
    if (targetX !== null && targetY !== null) {
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        player.velocityX = dx / speed;
        player.velocityY = dy / speed;
        
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
        
        createShieldParticles();
        updateShieldParticles();
        
        if (player.shieldTime >= player.shieldDuration) {
            player.hasShield = false;
            player.shieldTime = 0;
            player.shieldRadius = 0;
            shieldParticles = [];
        }
    }

    // Удерживаем игрока в пределах экрана
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // Обновление осколков
    updateDebris();

    // Создание астероидов
    frames++;
    
    const currentSpawnRate = Math.max(25, spawnRate - Math.floor(score / 100));
    if (frames % currentSpawnRate === 0) {
        createAsteroid();
        
        if (score > 300 && Math.random() < 0.25) {
            setTimeout(() => createAsteroid(), 100);
        }
    }
    
    // Щит появляется редко
    if (frames % (60 * 20) === 0 && shields.length === 0 && !player.hasShield) {
        createShieldBonus();
    }
    
    if (frames % 1800 === 0 && spawnRate > 20) {
        spawnRate -= 3;
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
                player.shieldRadius = player.radius + 10;
                
                createExplosionParticles(s.x, s.y, 20, true);
                
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
        
        a.x += a.speedX;
        a.y += a.speedY;
        a.rotation += a.rotationSpeed;

        const margin = 150;
        if (a.x < -a.radius - margin || a.x > canvas.width + a.radius + margin ||
            a.y < -a.radius - margin || a.y > canvas.height + a.radius + margin) {
            asteroids.splice(i, 1);
            continue;
        }

        if (!player.isExploding) {
            const dx = a.x - player.x;
            const dy = a.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (player.hasShield) {
                // Столкновение со щитом - астероид разваливается на осколки
                if (distance < a.radius + player.radius + player.shieldRadius * 0.8) {
                    createExplosionParticles(a.x, a.y, 25, true);
                    createAsteroidDebris(a); // Создаем осколки
                    score += 25;
                    asteroids.splice(i, 1);
                    continue;
                }
            } else {
                // Обычное столкновение без щита
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
    // Космический фон
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
    );
    gradient.addColorStop(0, 'rgba(0, 10, 30, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 5, 20, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Звёзды
    if (!window.starfield) {
        window.starfield = [];
        for (let i = 0; i < 200; i++) {
            window.starfield.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3,
                brightness: Math.random() * 0.8 + 0.2,
                speed: 0.2 + Math.random() * 0.3
            });
        }
    }
    
    window.starfield.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        star.y += star.speed + score / 5000;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    // Осколки астероидов
    drawDebris();

    // Астероиды
    asteroids.forEach(a => {
        drawAsteroid(a);
    });

    // Щиты-бонусы
    shields.forEach(s => {
        drawShieldBonus(s);
    });

    // Частицы щита
    shieldParticles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = `rgba(0, 200, 255, ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Щит игрока
    if (player.hasShield) {
        drawPlayerShield();
    }

    drawExplosion();

    if (!player.isExploding) {
        drawShip(player.x, player.y, player.radius, player.rotation, player.enginePower);
    }

    // Отображение времени щита
    if (player.hasShield) {
        const remainingTime = Math.max(0, player.shieldDuration - player.shieldTime);
        ctx.fillStyle = '#00FFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Щит: ${remainingTime.toFixed(1)}с`, canvas.width / 2, 40);
    }
    
    if (shields.length > 0) {
        ctx.fillStyle = '#00FFFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Щит доступен!`, 20, 40);
    }
}

// Функция для отрисовки щита-бонуса
function drawShieldBonus(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);
    
    if (s.collected) {
        ctx.globalAlpha = 0.5;
    }
    
    const lifeRatio = s.lifetime / 450;
    ctx.globalAlpha *= lifeRatio;
    
    const pulseFactor = 1 + Math.sin(s.pulse) * 0.3;
    
    const shieldGradient = ctx.createRadialGradient(
        0, 0, 0,
        0, 0, s.radius * pulseFactor
    );
    shieldGradient.addColorStop(0, 'rgba(0, 200, 255, 0.9)');
    shieldGradient.addColorStop(0.7, 'rgba(0, 100, 200, 0.6)');
    shieldGradient.addColorStop(1, 'rgba(0, 50, 150, 0)');
    
    ctx.fillStyle = shieldGradient;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * pulseFactor, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * pulseFactor, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = '#0080FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * pulseFactor * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${s.radius * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', 0, 0);
    
    ctx.restore();
    ctx.globalAlpha = 1;
}

// Функция для отрисовки щита игрока
function drawPlayerShield() {
    const shieldRadius = player.shieldRadius;
    const pulse = Math.sin(frames * 0.1) * 0.1 + 0.9;
    
    const outerShieldGradient = ctx.createRadialGradient(
        player.x, player.y, shieldRadius * 0.7,
        player.x, player.y, shieldRadius
    );
    outerShieldGradient.addColorStop(0, 'rgba(0, 200, 255, 0.4)');
    outerShieldGradient.addColorStop(1, 'rgba(0, 200, 255, 0)');
    
    ctx.fillStyle = outerShieldGradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, shieldRadius * pulse, 0, Math.PI * 2);
    ctx.fill();
    
    const innerShieldGradient = ctx.createRadialGradient(
        player.x, player.y, 0,
        player.x, player.y, shieldRadius * 0.8
    );
    innerShieldGradient.addColorStop(0, 'rgba(0, 200, 255, 0.15)');
    innerShieldGradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.08)');
    innerShieldGradient.addColorStop(1, 'rgba(0, 50, 255, 0)');
    
    ctx.fillStyle = innerShieldGradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, shieldRadius * 0.8 * pulse, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, shieldRadius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = '#0080FF';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, shieldRadius * 0.6 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Функция для отрисовки астероида
function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    
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
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
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
    
    ctx.fillStyle = 'rgba(70, 35, 0, 0.4)';
    a.craters.forEach(crater => {
        const craterX = crater.relX * a.radius;
        const craterY = crater.relY * a.radius;
        const craterSize = crater.size * a.radius;
        
        ctx.beginPath();
        ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
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
    ctx.stroke();
    
    ctx.restore();
}

// Функция для отрисовки корабля
function drawShip(x, y, radius, rotation, enginePower) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const scale = 0.6;
    const scaledRadius = radius * scale;
    
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
    
    ctx.fillStyle = 'rgba(42, 107, 156, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-scaledRadius * 0.6, 0, scaledRadius * 0.3, scaledRadius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(scaledRadius * 0.6, 0, scaledRadius * 0.3, scaledRadius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    
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
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-scaledRadius * 0.1, -scaledRadius * 0.4, scaledRadius * 0.1, scaledRadius * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
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
    
    if (enginePower > 0.1) {
        const engineLength = scaledRadius * 1.5 * enginePower;
        const engineWidth = scaledRadius * 0.8;
        
        const engineGradient = ctx.createLinearGradient(
            0, -engineWidth/2,
            0, engineWidth/2
        );
        engineGradient.addColorStop(0, '#ff5500');
        engineGradient.addColorStop(0.5, '#ffff00');
        engineGradient.addColorStop(1, '#ff5500');
        
        ctx.fillStyle = engineGradient;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -engineWidth/2);
        ctx.lineTo(-engineLength, 0);
        ctx.lineTo(0, engineWidth/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
    
    ctx.restore();
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
    }, 500);
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
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();
}

// Делаем функцию startGame глобально доступной
window.startGame = startGame;


// Обработчики кнопок
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Инициализация при загрузке
window.addEventListener('load', function() {
    console.log("Игра загружена!");
    initPlayer();
    highScoreElement.textContent = `Рекорд: ${highScore}`;
    resizeCanvas();
    
    // Тестовое сообщение
    setTimeout(function() {
        console.log("Игра готова к запуску!");
    }, 1000);
});

// Предотвращаем контекстное меню
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

console.log('🎮 Игра "Гипер-уворачиватель" загружена!');
console.log('💥 Теперь астероиды разваливаются на осколки при столкновении со щитом!');

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker зарегистрирован:', registration.scope);
            })
            .catch(error => {
                console.log('Ошибка регистрации Service Worker:', error);
            });
    });
}
