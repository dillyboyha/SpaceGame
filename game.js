const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");

const rocketImg = new Image();
rocketImg.src = "rocket.png";

const asteroidImg = new Image();
asteroidImg.src = "asteroid.png";

const trailImg = new Image();
trailImg.src = "stardust.png";

let score = 0;
let highScore = Number(localStorage.getItem("spaceDodgerHighScore")) || 0;
let gameOver = false;
let inMenu = true;
let asteroidSpeed = 3;

highScoreElement.innerText = "Best: " + highScore;
scoreElement.style.display = "none";
highScoreElement.style.display = "none";

const ship = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 40,
    width: 30,
    height: 30,
    color: "#00f",
    speed: 5,
    dx: 0,
};

let asteroids = [];
const asteroidSize = 30;
const asteroidColor = "#f00";
const maxAsteroids = 15;

let bullets = [];
const bulletSpeed = 8;
const bulletCooldownFrames = 12; // limits fire rate
let bulletCooldown = 0;

let particles = [];
const maxParticles = 80; // safety cap so effects can't pile up and cost too much

let spaceHeld = false;

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") ship.dx = -ship.speed;
    if (e.key === "ArrowRight" || e.key === "d") ship.dx = ship.speed;
    if (e.key === " ") {
        if (inMenu) {
            startGame();
        } else if (gameOver) {
            restartGame();
        } else {
            spaceHeld = true;
        }
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "ArrowRight" || e.key === "d") {
        ship.dx = 0;
    }
    if (e.key === " ") spaceHeld = false;
});

function createAsteroid() {
    const x = Math.random() * (canvas.width - asteroidSize);
    asteroids.push({ x: x, y: -asteroidSize, width: asteroidSize, height: asteroidSize, age: 0 });
}

function shatterAsteroid(centerX, centerY) {
    const count = 6;
    for (let p = 0; p < count; p++) {
        if (particles.length >= maxParticles) break;
        const angle = (Math.PI * 2 * p) / count + Math.random() * 0.5;
        const speed = 1.5 + Math.random() * 2.5;
        particles.push({
            x: centerX,
            y: centerY,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 3,
            life: 20,
            maxLife: 20,
        });
    }
}

function drawMenu(pulseAlpha) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 40px monospace";
    ctx.fillText("SPACE DODGER", canvas.width / 2, 130);

    // Little rocket for flavor
    ctx.drawImage(rocketImg, canvas.width / 2 - 20, 160, 40, 40);

    ctx.font = "16px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("Arrow keys / A D to move", canvas.width / 2, 240);
    ctx.fillText("Space to shoot", canvas.width / 2, 265);

    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.fillText("Press SPACE to start", canvas.width / 2, 320);
    ctx.globalAlpha = 1;

    if (highScore > 0) {
        ctx.fillStyle = "#aaa";
        ctx.font = "14px monospace";
        ctx.fillText("Best: " + highScore, canvas.width / 2, 360);
    }
}

function menuLoop(timestamp) {
    if (!inMenu) return; // stop as soon as the game starts

    const pulseAlpha = 0.5 + 0.5 * Math.sin(timestamp / 300);
    drawMenu(pulseAlpha);

    requestAnimationFrame(menuLoop);
}

function startGame() {
    inMenu = false;
    scoreElement.style.display = "block";
    highScoreElement.style.display = "block";
    restartGame();
}

function update() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ship.x += ship.dx;
    if (ship.x < 0) ship.x = 0;
    if (ship.x + ship.width > canvas.width) ship.x = canvas.width - ship.width;

    ctx.drawImage(rocketImg, ship.x, ship.y, ship.width, ship.height);

    // Firing
    if (bulletCooldown > 0) bulletCooldown--;
    if (spaceHeld && bulletCooldown === 0) {
        bullets.push({ x: ship.x + ship.width / 2 - 2, y: ship.y, width: 4, height: 10 });
        bulletCooldown = bulletCooldownFrames;
    }

    // Update & draw bullets
    for (let b = bullets.length - 1; b >= 0; b--) {
        const bullet = bullets[b];
        bullet.y -= bulletSpeed;

        if (bullet.y + bullet.height < 0) {
            bullets.splice(b, 1);
            continue;
        }

        ctx.fillStyle = "#0ff";
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
        const ast = asteroids[i];

        // Age it up (capped) — used to grow the trail in over the first several frames
        ast.age = Math.min(ast.age + 1, 40);

        ast.y += asteroidSpeed;

        if (
            ship.x < ast.x + ast.width &&
            ship.x + ship.width > ast.x &&
            ship.y < ast.y + ast.height &&
            ship.y + ship.height > ast.y
        ) {
            endGame();
        }

        // Check bullets against this asteroid
        let wasShot = false;
        for (let b = bullets.length - 1; b >= 0; b--) {
            const bullet = bullets[b];
            if (
                bullet.x < ast.x + ast.width &&
                bullet.x + bullet.width > ast.x &&
                bullet.y < ast.y + ast.height &&
                bullet.y + bullet.height > ast.y
            ) {
                bullets.splice(b, 1);
                wasShot = true;
                break;
            }
        }
        if (wasShot) {
            shatterAsteroid(ast.x + ast.width / 2, ast.y + ast.height / 2);
            asteroids.splice(i, 1);
            score++;
            scoreElement.innerText = "Score: " + score;
            if (score > highScore) {
                highScore = score;
                highScoreElement.innerText = "Best: " + highScore;
                localStorage.setItem("spaceDodgerHighScore", highScore);
            }
            if (score % 5 === 0) {
                asteroidSpeed += 0.5;
            }
            continue;
        }

        // Draw stardust trail: one rotated, stretched stamp above the asteroid (cheap: 1 draw call)
        if (trailImg.complete && trailImg.naturalWidth > 0) {
            const trailLength = ast.age * 1.5;        // grows in as the asteroid ages
            const trailWidth = ast.width * 1.1;
            const centerX = ast.x + ast.width / 2;
            const centerY = ast.y - trailLength / 2;   // trail sits above (behind) the asteroid

            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.translate(centerX, centerY);
            ctx.rotate(Math.PI / 2); // rotate so the image's long edge points vertically
            // after rotation, "width" runs along what was the image's height axis
            ctx.drawImage(trailImg, -trailLength / 2, -trailWidth / 2, trailLength, trailWidth);
            ctx.restore();
        }

        ctx.drawImage(asteroidImg, ast.x, ast.y, ast.width, ast.height);

        if (ast.y > canvas.height) {
            asteroids.splice(i, 1);
            score++;
            scoreElement.innerText = "Score: " + score;
            if (score > highScore) {
                highScore = score;
                highScoreElement.innerText = "Best: " + highScore;
                localStorage.setItem("spaceDodgerHighScore", highScore);
            }
            if (score % 5 === 0) {
                asteroidSpeed += 0.5;
            }
        }
    }

    if (asteroids.length < maxAsteroids && Math.random() < 0.02) {
        createAsteroid();
    }

    // Update & draw shatter particles
    for (let p = particles.length - 1; p >= 0; p--) {
        const particle = particles[p];
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;

        if (particle.life <= 0) {
            particles.splice(p, 1);
            continue;
        }

        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = "#c87850"; // matches the asteroid's rocky tone
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        ctx.globalAlpha = 1;
    }

    requestAnimationFrame(update);
}

function endGame() {
    gameOver = true;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "40px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px monospace";
    ctx.fillText("Press SPACE to restart", canvas.width / 2, canvas.height / 2 + 40);
}

function restartGame() {
    score = 0;
    asteroids = [];
    bullets = [];
    particles = [];
    bulletCooldown = 0;
    gameOver = false;
    asteroidSpeed = 3;
    ship.x = canvas.width / 2 - ship.width / 2;
    scoreElement.innerText = "Score: " + score;
    update();
}

requestAnimationFrame(menuLoop);