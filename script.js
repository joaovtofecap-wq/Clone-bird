const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');
const livesDisplay = document.getElementById('lives-display');

// Estados do Jogo
const STATE_START = 0;
const STATE_PLAYING = 1;
const STATE_GAMEOVER = 2;

let currentState = STATE_START;
let frames = 0;
let score = 0;
let lives = 3;
let speedMultiplier = 1; // Multiplicador base inicial
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
        // Adiciona um novo cano a cada 100 frames (com ajuste de spawn na velocidade nova)
        if (frames % Math.max(40, Math.floor(100 / speedMultiplier)) === 0) {
            this.items.push({
                x: canvas.width,
                top: Math.random() * (canvas.height - this.gap - 120) + 60,
                passed: false
            });
        }

        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= this.dx * speedMultiplier;

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
                
                // Aumenta a velocidade a cada 20 pontos
                speedMultiplier = 1 + Math.floor(score / 20) * 0.2; // Aumenta 20% da velocidade a cada 20 pts

                // CONDIÇÃO DE VITÓRIA
                if (score >= 200) {
                    gameWin();
                }
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

// Objeto Projéteis
const projectiles = {
    items: [],
    width: 15,
    height: 5,
    speed: 8,

    draw() {
        ctx.fillStyle = '#e74c3c'; // Tiro Vermelho
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            ctx.fillRect(p.x, p.y, this.width, this.height);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(p.x, p.y, this.width, this.height);
        }
    },

    update() {
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x += this.speed;

            if (p.x > canvas.width) {
                this.items.splice(i, 1);
                i--;
            }
        }
    },

    shoot() {
        this.items.push({
            x: bird.x + bird.radius + 20,
            y: bird.y + bird.radius
        });
    },

    reset() {
        this.items = [];
    }
};

// Objeto Inimigos
const enemies = {
    items: [],
    radius: 15, // Mesmo tamanho do player
    speed: 4,

    // ...
    draw() {
        for (let i = 0; i < this.items.length; i++) {
            let e = this.items[i];
            
            // Corpo do Pássaro Inimigo (igual ao player mas vermelho e virado pro outro lado)
            ctx.fillStyle = '#e74c3c'; // Vermelho
            ctx.beginPath();
            ctx.arc(e.x + this.radius, e.y + this.radius, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000'; // Borda
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Olho (virado para a esquerda)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(e.x + this.radius - 6, e.y + this.radius - 5, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#eb2f06'; // Pupila vermelha pra dar aparência de mau
            ctx.beginPath();
            ctx.arc(e.x + this.radius - 7, e.y + this.radius - 5, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Bico (virado para a esquerda)
            ctx.fillStyle = '#e67e22';
            ctx.beginPath();
            ctx.moveTo(e.x + this.radius - 10, e.y + this.radius);
            ctx.lineTo(e.x + this.radius - 20, e.y + this.radius + 5);
            ctx.lineTo(e.x + this.radius - 10, e.y + this.radius + 10);
            ctx.fill();
            ctx.stroke();
        }
    },

    enemyTimer: 0,
    
    update() {
        // Gera novos inimigos apenas se a pontuação for maior ou igual a 10
        if (score >= 10) {
            let spawnDelay = Math.max(60, Math.floor(150 / speedMultiplier));
            
            this.enemyTimer++;
            
            if (this.enemyTimer >= spawnDelay) {
                this.items.push({
                    x: canvas.width + 20,
                    y: bird.y, // Nasce sempre na exata altura que o passarinho está
                    hp: 1 // Morre com 1 tiro
                });
                this.enemyTimer = 0; // Reseta o timer
            }
        }

        for (let i = 0; i < this.items.length; i++) {
            let e = this.items[i];
            e.x -= e.speed * speedMultiplier;
            
            // Perseguir o jogador no eixo Y
            if (e.y < bird.y) {
                e.y += 1.5; // Vai descendo
            } else if (e.y > bird.y) {
                e.y -= 1.5; // Vai subindo
            }
            
            // Limitar a altura do inimigo para ele nunca sair da tela
            if (e.y < 0) {
                e.y = 0;
            } else if (e.y + this.radius > canvas.height) {
                e.y = canvas.height - this.radius;
            }

            // Colisão com os tiros
            let killed = false;
            for (let j = 0; j < projectiles.items.length; j++) {
                let p = projectiles.items[j];
                let distX = Math.abs(e.x - p.x - projectiles.width / 2);
                let distY = Math.abs(e.y - p.y - projectiles.height / 2);

                if (distX <= (projectiles.width / 2 + this.radius) && distY <= (projectiles.height / 2 + this.radius)) {
                    projectiles.items.splice(j, 1); // Destrói o tiro
                    e.hp--; // Diminui HP do inimigo
                    
                    if (e.hp <= 0) {
                        this.items.splice(i, 1); // Destrói inimigo
                        i--;
                        killed = true;
                    }
                    break;
                }
            }
            if (killed) continue;

            // Colisão com o pássaro
            let distX = Math.abs((e.x + this.radius) - (bird.x + bird.radius));
            let distY = Math.abs((e.y + this.radius) - (bird.y + bird.radius));
            let distance = Math.sqrt(distX * distX + distY * distY);

            // Reduzi o raio de colisão só por segurança pra não ser injusto
            if (distance < bird.radius + this.radius - 5) {
                lives--;
                livesDisplay.innerText = `Vidas: ${lives}`;
                this.items.splice(i, 1);
                i--;
                if (lives <= 0) {
                    gameOver();
                }
                continue;
            }

            // Remove inimigos fora da tela
            if (e.x + (this.radius * 2) < -10) {
                this.items.splice(i, 1);
                i--;
            }
        }
    },

    reset() {
        this.items = [];
        this.enemyTimer = 0;
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
    projectiles.draw();
    enemies.draw();
    bird.draw();
}

function update() {
    bird.update();
    pipes.update();
    projectiles.update();
    enemies.update();
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
    livesDisplay.classList.remove('hidden');
    
    bird.reset();
    pipes.reset();
    projectiles.reset();
    enemies.reset();
    score = 0;
    lives = 3;
    speedMultiplier = 1;
    frames = 0;
    scoreDisplay.innerText = score;
    livesDisplay.innerText = `Vidas: ${lives}`;
    
    loop();
}

function gameOver() {
    currentState = STATE_GAMEOVER;
    cancelAnimationFrame(animationId);
    
    scoreDisplay.classList.add('hidden');
    livesDisplay.classList.add('hidden');
    document.querySelector('#game-over-screen h1').innerText = "Game Over";
    document.querySelector('#game-over-screen h1').style.color = "#f1c40f";
    finalScoreDisplay.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function gameWin() {
    currentState = STATE_GAMEOVER;
    cancelAnimationFrame(animationId);
    
    scoreDisplay.classList.add('hidden');
    livesDisplay.classList.add('hidden');
    // Reutiliza a tela de game over mas com texto de vitória
    document.querySelector('#game-over-screen h1').innerText = "VOCÊ VENCEU!";
    document.querySelector('#game-over-screen h1').style.color = "#2ecc71"; // Verde ao jogar
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
        projectiles.shoot();
    } else if (currentState === STATE_GAMEOVER) {
        startGame();
    }
}

// Renderiza o frame inicial
bird.reset();
draw();
