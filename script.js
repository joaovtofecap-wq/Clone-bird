const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');

// Estados do Jogo
const STATE_START = 0;
const STATE_PLAYING = 1;
const STATE_GAMEOVER = 2;

let currentState = STATE_START;
let frames = 0;
let score = 0;
let animationId;

// Objeto Passarinho
const bird = {
    x: 60,
    y: 150,
    width: 30,
    height: 30,
    velocity: 0,
    gravity: 0.5,
    jump: -7.5,
    radius: 15,

    draw() {
        ctx.fillStyle = '#f1c40f'; // Amarelo
        ctx.beginPath();
        ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000'; // Borda
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Olho
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + this.radius + 6, this.y + this.radius - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.radius + 7, this.y + this.radius - 5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Bico
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(this.x + this.radius + 10, this.y + this.radius);
        ctx.lineTo(this.x + this.radius + 20, this.y + this.radius + 5);
        ctx.lineTo(this.x + this.radius + 10, this.y + this.radius + 10);
        ctx.fill();
        ctx.stroke();
    },

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Colisão com o chão
        if (this.y + this.height >= canvas.height) {
            this.y = canvas.height - this.height;
            gameOver();
        }
        
        // Colisão com o teto
        if (this.y <= 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },

    flap() {
        this.velocity = this.jump;
    },
    
    reset() {
        this.y = 150;
        this.velocity = 0;
    }
};

// Objeto Canos
const pipes = {
    items: [],
    width: 55,
    gap: 140, // Espaço entre o cano de cima e o de baixo
    dx: 3,    // Velocidade que os canos movem para a esquerda

    draw() {
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            
            ctx.fillStyle = '#2ecc71'; // Verde padrão do cano principal
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000';

            // Cano de Cima
            ctx.fillRect(p.x, 0, this.width, p.top);
            ctx.strokeRect(p.x, 0, this.width, p.top);
            // Borda superior grossa (detalhe do cano)
            ctx.fillRect(p.x - 3, p.top - 20, this.width + 6, 20);
            ctx.strokeRect(p.x - 3, p.top - 20, this.width + 6, 20);
            
            // Cano de Baixo
            ctx.fillRect(p.x, p.top + this.gap, this.width, canvas.height - p.top - this.gap);
            ctx.strokeRect(p.x, p.top + this.gap, this.width, canvas.height - p.top - this.gap);
            // Borda inferior grossa
            ctx.fillRect(p.x - 3, p.top + this.gap, this.width + 6, 20);
            ctx.strokeRect(p.x - 3, p.top + this.gap, this.width + 6, 20);
        }
    },

    update() {
        // Adiciona um novo cano a cada 100 frames
        if (frames % 100 === 0) {
            this.items.push({
                x: canvas.width,
                top: Math.random() * (canvas.height - this.gap - 120) + 60,
                passed: false
            });
        }

        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= this.dx;

            // Detecção de colisão (AABB)
            if (bird.x + bird.width > p.x && bird.x < p.x + this.width &&
                (bird.y < p.top || bird.y + bird.height > p.top + this.gap)) {
                gameOver();
            }

            // Atualiza pontuação quando o pássaro passa do cano
            if (p.x + this.width < bird.x && !p.passed) {
                score++;
                scoreDisplay.innerText = score;
                p.passed = true;
            }

            // Remove canos que saíram da tela
            if (p.x + this.width < -10) {
                this.items.shift();
                i--;
            }
        }
    },
    
    reset() {
        this.items = [];
    }
};

function draw() {
    // Fundo do céu
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Chão falso (chão fixo verde embaixo)
    ctx.fillStyle = '#ded895'; // Cor de areia
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    ctx.fillStyle = '#73bf2e'; // Grama
    ctx.fillRect(0, canvas.height - 25, canvas.width, 5);
    ctx.strokeRect(0, canvas.height - 25, canvas.width, 5);

    // Desenha canos e pássaro
    pipes.draw();
    bird.draw();
}

function update() {
    bird.update();
    pipes.update();
}

function loop() {
    if (currentState === STATE_PLAYING) {
        update();
        draw();
        frames++;
        animationId = requestAnimationFrame(loop);
    }
}

function startGame() {
    currentState = STATE_PLAYING;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    
    bird.reset();
    pipes.reset();
    score = 0;
    frames = 0;
    scoreDisplay.innerText = score;
    
    loop();
}

function gameOver() {
    currentState = STATE_GAMEOVER;
    cancelAnimationFrame(animationId);
    
    scoreDisplay.classList.add('hidden');
    finalScoreDisplay.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

// Controle por teclado
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleInput();
    }
});

// Controle por mouse/toque
window.addEventListener('mousedown', () => {
    handleInput();
});

window.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Evita scroll em telas touch
    handleInput();
}, { passive: false });

function handleInput() {
    if (currentState === STATE_START) {
        startGame();
    } else if (currentState === STATE_PLAYING) {
        bird.flap();
    } else if (currentState === STATE_GAMEOVER) {
        startGame();
    }
}

// Renderiza o frame inicial
bird.reset();
draw();
