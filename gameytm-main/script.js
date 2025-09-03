// ========== KONFIGURASI GAME ========== //
const config = {
    playerSpeed: 10,
    trashSpawnRate: 4000,
    trashSpeed: { min: 1.5, max: 3.5 },
    scoreCorrect: 20,
    scoreWrong: -5,
    maxLives: 5
};

// ========== VARIABEL GAME ========== //
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreElement = document.getElementById('scoreValue');
const livesElement = document.getElementById('livesValue');
const timeElement = document.getElementById('timeValue');
const finalScoreElement = document.getElementById('finalScore');

let score = 0;
let lives = config.maxLives;
let gameTime = 0;
let gameActive = false;
let animationId = null;
let trashItems = [];
let particles = [];

// ========== OBJEK GAME ========== //
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 50,
    height: 80,
    speed: config.playerSpeed,
    direction: 0,
    holding: null,
    frame: 0
};

const bins = [
    { type: 'organik', x: 0, y: 0, width: 0, height: 50, color: '#6BCB77', label: 'ORGANIK' },
    { type: 'anorganik', x: 0, y: 0, width: 0, height: 50, color: '#4D96FF', label: 'ANORGANIK' },
    { type: 'b3', x: 0, y: 0, width: 0, height: 50, color: 'red', label: 'B3' }
];

const trashTypes = [
    { type: 'organik', emoji: '🍌', color: '#FFD166', width: 30, height: 30 },
    { type: 'organik', emoji: '🍃', color: '#6BCB77', width: 25, height: 25 },
    { type: 'anorganik', emoji: '🧴', color: '#4D96FF', width: 20, height: 40 },
    { type: 'anorganik', emoji: '🥫', color: '#8395A7', width: 30, height: 30 },
    { type: 'b3', emoji: '🔋', color: '#FF6B6B', width: 25, height: 35 }
];

// ========== INISIALISASI GAME ========== //
function init() {
    resizeCanvas();
    setupBins();
    setupControls();
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth, 450);
    canvas.height = Math.min(window.innerHeight, 800);
    player.y = canvas.height - 100;
    setupBins();
}

function setupBins() {
    const binWidth = canvas.width / bins.length - 20;
    bins.forEach((bin, i) => {
        bin.x = 10 + (i * (binWidth + 10));
        bin.width = binWidth;
        bin.y = canvas.height - 60;
    });
}

function setupControls() {
    const leftBtn = document.querySelector('.left-btn');
    const rightBtn = document.querySelector('.right-btn');
    const actionBtn = document.querySelector('.action-btn');

    // Touch controls
    [leftBtn, rightBtn, actionBtn].forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (btn === leftBtn) player.direction = -1;
            if (btn === rightBtn) player.direction = 1;
            if (btn === actionBtn && player.holding) throwTrash();
        });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (btn === leftBtn || btn === rightBtn) player.direction = 0;
        });
    });

    // Mouse controls
    leftBtn.addEventListener('mousedown', () => player.direction = -1);
    rightBtn.addEventListener('mousedown', () => player.direction = 1);
    actionBtn.addEventListener('mousedown', () => { if (player.holding) throwTrash(); });
    leftBtn.addEventListener('mouseup', () => player.direction = 0);
    rightBtn.addEventListener('mouseup', () => player.direction = 0);
}

// ========== LOGIKA GAME ========== //
function startGame() {
    startScreen.classList.add('hidden');
    resetGame();
    gameActive = true;
    gameLoop();
}

function resetGame() {
    score = 0;
    lives = config.maxLives;
    gameTime = 0;
    trashItems = [];
    particles = [];
    player.x = canvas.width / 2;
    player.holding = null;
    updateUI();
}

function gameLoop() {
    if (!gameActive) return;

    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    // Update player
    player.x += player.direction * player.speed;
    player.x = Math.max(player.width/2, Math.min(canvas.width - player.width/2, player.x));
    player.frame = (player.frame + 0.1) % 4;

    // Spawn trash
    if (Date.now() - lastTrashSpawn > config.trashSpawnRate) {
        spawnTrash();
        lastTrashSpawn = Date.now();
    }

    // Update trash
    trashItems.forEach((trash, i) => {
        trash.y += trash.speed;
        trash.rotation += trash.rotationSpeed;

        // Check collision with player
        if (!player.holding && isColliding(trash, player)) {
            player.holding = trash;
            trashItems.splice(i, 1);
        }

        // Check if trash fell
        if (trash.y > canvas.height) {
            trashItems.splice(i, 1);
            loseLife();
        }
    });

    // Update particles
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;

        if (p.life <= 0) particles.splice(i, 1);
    });

    // Update time
    gameTime += 1/60;
    updateUI();
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();

    // Draw bins
    drawBins();

    // Draw trash
    drawTrash();

    // Draw player
    drawPlayer();

    // Draw particles
    drawParticles();
}

// ========== FUNGSI UTAMA ========== //
function spawnTrash() {
    const type = Math.floor(Math.random() * trashTypes.length);
    const trash = {
        ...trashTypes[type],
        x: Math.random() * (canvas.width - 40) + 20,
        y: -50,
        speed: config.trashSpeed.min + Math.random() * (config.trashSpeed.max - config.trashSpeed.min),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1
    };
    trashItems.push(trash);
}

function throwTrash() {
    const trash = player.holding;
    let correctBin = false;

    bins.forEach(bin => {
        if (player.x > bin.x && player.x < bin.x + bin.width) {
            if (bin.type === trash.type) {
                score += config.scoreCorrect;
                correctBin = true;
                createParticles(bin.x + bin.width/2, bin.y, bin.color);
            } else {
                score = Math.max(0, score + config.scoreWrong);
                createParticles(bin.x + bin.width/2, bin.y, '#FF6B6B');
            }
        }
    });

    player.holding = null;
    updateUI();
}

function loseLife() {
    lives--;
    updateUI();
    if (lives <= 0) endGame();
}

function endGame() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// ========== FUNGSI RENDER ========== //
function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 3; i++) {
        const x = (i * 200 + gameTime * 10) % (canvas.width + 200) - 100;
        ctx.beginPath();
        ctx.arc(x, 50 + i * 30, 20 + i * 5, 0, Math.PI * 2);
        ctx.arc(x + 30, 50 + i * 30, 25 + i * 5, 0, Math.PI * 2);
        ctx.arc(x + 60, 50 + i * 30, 20 + i * 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#6BCB77';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
}

function drawBins() {
    bins.forEach(bin => {
        // Bin body
        ctx.fillStyle = bin.color;
        ctx.beginPath();
        ctx.roundRect(bin.x, bin.y, bin.width, bin.height, 10);
        ctx.fill();

        // Bin label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText(bin.label, bin.x + bin.width/2, bin.y + bin.height/2 + 5);
    });
}

function drawTrash() {
    trashItems.forEach(trash => {
        ctx.save();
        ctx.translate(trash.x, trash.y);
        ctx.rotate(trash.rotation);

        // Trash body
        ctx.fillStyle = trash.color;
        ctx.beginPath();
        ctx.roundRect(-trash.width/2, -trash.height/2, trash.width, trash.height, 5);
        ctx.fill();

        // Trash icon
        ctx.fillStyle = 'white';
        ctx.font = `${Math.min(trash.width, trash.height)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(trash.emoji, 0, 0);

        ctx.restore();
    });

    // Held trash
    if (player.holding) {
        const trash = player.holding;
        ctx.save();
        ctx.translate(player.x, player.y - 50);

        // Trash body
        ctx.fillStyle = trash.color;
        ctx.beginPath();
        ctx.roundRect(-trash.width/2, -trash.height/2, trash.width, trash.height, 5);
        ctx.fill();

        // Trash icon
        ctx.fillStyle = 'white';
        ctx.font = `${Math.min(trash.width, trash.height)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(trash.emoji, 0, 0);

        ctx.restore();
    }
}

function drawPlayer() {
    // Body
    ctx.fillStyle = '#FF9E00';
    ctx.beginPath();
    ctx.arc(player.x, player.y - 20, 20, 0, Math.PI * 2);

    // Animation frames
    if (player.frame < 1) {
        ctx.fillRect(player.x - 15, player.y, 30, 40);
    } else if (player.frame < 2) {
        ctx.fillRect(player.x - 20, player.y, 40, 40);
    } else {
        ctx.fillRect(player.x - 10, player.y, 20, 40);
    }

    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x - 8, player.y - 25, 5, 0, Math.PI * 2);
    ctx.arc(player.x + 8, player.y - 25, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(player.x - 8 + player.direction * 3, player.y - 25, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 8 + player.direction * 3, player.y - 25, 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            size: Math.random() * 5 + 2,
            color: color,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 5,
            life: Math.random() * 30 + 20
        });
    }
}

function updateUI() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// ========== MULAI GAME ========== //
let lastTrashSpawn = 0;
init();

// Di bagian event listeners (dekat init())
restartButton.addEventListener('click', restartGame);

// Fungsi restartGame
function restartGame() {
    gameOverScreen.classList.add('hidden'); // Sembunyikan layar game over
    resetGame(); // Reset semua nilai game
    gameActive = true; // Aktifkan game
    gameLoop(); // Mulai loop game
}

// Fungsi resetGame
function resetGame() {
    score = 0;
    lives = 5;
    gameTime = 0;
    trashItems = [];
    player.x = canvas.width / 2;
    player.holding = null;
    updateUI(); // Update tampilan skor/nyawa
}