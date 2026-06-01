document.addEventListener('click', (e) => {
    if (e.target.classList.contains('pranie')) {
        document.querySelectorAll('.pranie').forEach(p => p.classList.remove('clicked'));
        e.target.classList.add('clicked');
        setTimeout(() => { e.target.classList.remove('clicked'); }, 3000);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("LGC Engine Ready");

    const canvas = document.getElementById('cloud-canvas');
    if (!canvas) return; 
    
    const ctx = canvas.getContext('2d');
    const PIXEL_SIZE = 4;

    const COLORS = {
        highlight: '#94a3b8',   
        base: '#475569',        
        shadowLight: '#334155', 
        shadowDark: '#1e293b'   
    };

    let gameActive = false;
    let gameState = "RUNNING"; 

    let player = { x: 60, y: 0, w: 24, h: 48, vy: 0, isJumping: false };
    let obstacles = [];
    let gameTimer = 0;
    let requiredRunTime = 250; 
    
    let spraySequence = [];
    let sprayIndex = 0;
    const keysPool = ['W', 'A', 'S', 'D'];

    const stories = [
        "LGC powstało jak kable zwisały nad blokami w 98. Kapibara wybrała mnie.",
        "Heniek z garaży mówi że LGC to nie crew, to rodzina. Kapibara potwierdza.",
        "Widzisz ten mural 'Start Osiedle Misja Kontakt'? To my go pilnowaliśmy całą noc.",
        "46 jeździ rzadko, ale kapibara zawsze zdąży. Mamy swoje skróty między blokami.",
        "Żabka na dole? Płacimy groszem, bo to Ostatni Grosz. Kapibara ma zniżkę stałego klienta."
    ];

    const mouth = document.getElementById("mouth");
    const kapibaraChat = document.getElementById("kapibaraChat");
    const kapibaraChatWindow = document.getElementById("kapibaraChatWindow");
    const kapibaraInput = document.getElementById("kapibaraInput");
    const kapibaraSend = document.getElementById("kapibaraSend");
    const closeChat = document.getElementById("closeChat");

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.45;
        if (gameActive) {
            player.y = (canvas.height - 50) - player.h;
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // CHMURY (TRYB PASYWNY)
    class DetailedPixelCloud {
        constructor(isInitial = false) {
            this.puffs = [];
            this.grid = {};
            const puffCount = Math.floor(Math.random() * 4) + 4; 
            let currentX = 0;
            for (let i = 0; i < puffCount; i++) {
                const radius = Math.floor(Math.random() * 6) + 4;
                const heightOffset = Math.floor(Math.random() * 4) - 2;
                this.puffs.push({ cx: currentX + radius, cy: 12 + heightOffset, r: radius });
                currentX += Math.floor(radius * 1.3);
            }
            this.width = currentX + 10;
            this.height = 30;
            this.speed = Math.random() * 0.20 + 0.10;
            this.x = isInitial ? (Math.random() * (canvas.width + this.width * PIXEL_SIZE) - this.width * PIXEL_SIZE) : -this.width * PIXEL_SIZE;
            this.y = Math.random() * (canvas.height - this.height * PIXEL_SIZE - 40) + 10;
            this.opacity = Math.random() * 0.15 + 0.80; 
            this.generatePixelMatrix();
        }
        generatePixelMatrix() {
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    let inside = false;
                    for (let puff of this.puffs) {
                        const dx = x - puff.cx; const dy = y - puff.cy;
                        if (Math.sqrt(dx*dx + dy*dy) <= puff.r) { inside = true; break; }
                    }
                    if (inside) this.grid[`${x},${y}`] = { x, y };
                }
            }
            for (let key in this.grid) {
                const p = this.grid[key];
                let columnPixels = Object.values(this.grid).filter(pt => pt.x === p.x);
                let minY = Math.min(...columnPixels.map(pt => pt.y));
                let maxY = Math.max(...columnPixels.map(pt => pt.y));
                let colHeight = maxY - minY;
                let relativeY = (p.y - minY) / (colHeight || 1);
                let finalColor = COLORS.base;
                if (relativeY < 0.15) finalColor = COLORS.highlight;
                else if (relativeY < 0.28) finalColor = ((p.x + p.y) % 2 === 0) ? COLORS.highlight : COLORS.base;
                else if (relativeY < 0.55) finalColor = COLORS.base;
                else if (relativeY < 0.68) finalColor = ((p.x + p.y) % 2 === 0) ? COLORS.base : COLORS.shadowLight;
                else if (relativeY < 0.85) finalColor = COLORS.shadowLight;
                else finalColor = COLORS.shadowDark;
                p.color = finalColor;
            }
        }
        update() { this.x += this.speed; }
        draw() {
            ctx.save(); ctx.globalAlpha = this.opacity; ctx.imageSmoothingEnabled = false;
            for (let key in this.grid) {
                const block = this.grid[key];
                ctx.fillStyle = block.color;
                ctx.fillRect(Math.round(this.x + block.x * PIXEL_SIZE), Math.round(this.y + block.y * PIXEL_SIZE), PIXEL_SIZE, PIXEL_SIZE);
            }
            ctx.restore();
        }
    }

    let clouds = [];
    for (let i = 0; i < 4; i++) clouds.push(new DetailedPixelCloud(true));

    // URUCHOMIENIE GRY
    function startGraffitiGame() {
        // ABSOLUTNE UKRYCIE CZATU ŻEBY NIE ZASŁANIAŁ TABLETU
        if (kapibaraChat) {
            kapibaraChat.style.setProperty('display', 'none', 'important');
        }
        
        const popup = document.getElementById("popup");
        if (popup) popup.style.display = "none";

        gameActive = true;
        gameState = "RUNNING";
        gameTimer = 0;
        obstacles = [];
        
        const groundY = canvas.height - 40;
        player.y = groundY - player.h; 
        player.vy = 0;
        player.isJumping = false;
    }

    function spawnObstacle() {
        if (gameState !== "RUNNING" || Math.random() > 0.03 || obstacles.length > 1) return;
        const groundY = canvas.height - 40;
        let isTrain = Math.random() > 0.4; 
        
        obstacles.push({
            x: canvas.width + 50,
            y: isTrain ? groundY - 35 : groundY - 65,
            w: isTrain ? 50 : 25,
            h: isTrain ? 35 : 10,
            type: isTrain ? "TRAIN" : "CABLE",
            color: isTrain ? "#1e3a8a" : "#facc15" 
        });
    }

    function initSpraySequence() {
        gameState = "SPRAYING";
        spraySequence = [];
        sprayIndex = 0;
    }

    // PĘTLA DYSKRETNA GRY
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!gameActive) {
            clouds.forEach((cloud, index) => {
                cloud.update();
                cloud.draw();
                if (cloud.x > canvas.width) clouds[index] = new DetailedPixelCloud(false);
            });
        } else {
            const groundY = canvas.height - 40;

            // Rysowanie tła gry pod spodem
            ctx.fillStyle = "#0f172a"; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#475569";
            ctx.fillRect(0, groundY, canvas.width, 6);

            if (gameState === "RUNNING") {
                gameTimer++;
                
                player.y += player.vy;
                if (player.y < groundY - player.h) {
                    player.vy += 0.6; 
                } else {
                    player.y = groundY - player.h;
                    player.vy = 0;
                    player.isJumping = false;
                }

                // Gracz
                ctx.fillStyle = "#ec4899"; 
                ctx.fillRect(player.x, player.y, player.w, player.h);
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 2;
                ctx.strokeRect(player.x, player.y, player.w, player.h);
                
                ctx.fillStyle = "#facc15";
                ctx.fillRect(player.x - 3, player.y, player.w + 5, 6);

                spawnObstacle();

                obstacles.forEach((obs) => {
                    obs.x -= 7; 
                    ctx.fillStyle = obs.color;
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

                    // Kolizje
                    if (player.x < obs.x + obs.w && player.x + player.w > obs.x &&
                        player.y < obs.y + obs.h && player.y + player.h > obs.y) {
                            gameActive = false;
                            // CZAT WRACA DOPIERO PO PRZEGRANEJ
                            if (kapibaraChat) kapibaraChat.style.display = "flex";
                            kapibaraAddMsg("SOK: Stój policja! Złapali Cię... Kliknij ponownie 'Misje', żeby spróbować jeszcze raz.", "bot");
                    }
                });

                obstacles = obstacles.filter(obs => obs.x > -100);

                if (gameTimer > requiredRunTime) initSpraySequence();

                // Pasek postępu
                ctx.fillStyle = "#1e293b"; ctx.fillRect(20, 10, canvas.width - 40, 6);
                ctx.fillStyle = "#22c55e"; ctx.fillRect(20, 10, ((gameTimer / requiredRunTime) * (canvas.width - 40)), 6);

            } else if (gameState === "SPRAYING") {
                ctx.fillStyle = "#334155"; ctx.fillRect(20, 15, canvas.width - 40, canvas.height - 30);
                ctx.fillStyle = "#fff"; ctx.font = "bold 12px monospace";
                ctx.fillText("MALOWANIE PANELU LGC W TOKU...", canvas.width/2 - 100, canvas.height/2);
                
                setTimeout(() => {
                    if (gameActive && gameState === "SPRAYING") {
                        gameActive = false;
                        if (kapibaraChat) kapibaraChat.style.display = "flex";
                        kapibaraAddMsg("Mordo! Panel LGC skończony! Cały skład zmalowany. Akcja idealna!", "bot");
                        
                        setTimeout(() => {
                            const popup = document.getElementById("popup");
                            const story = document.getElementById("story");
                            if (popup && story) {
                                popup.style.display = "block";
                                story.innerText = "MISJA ZALICZONA! " + stories[Math.floor(Math.random() * stories.length)];
                            }
                        }, 1000);
                    }
                }, 1800);
            }
        }
        requestAnimationFrame(animate);
    }
    animate();

    // SKOK PRZEZ PACNIĘCIE PALCEM (EFEKTYWNE NA TABLETACH)
    window.addEventListener('touchstart', (e) => {
        if (gameActive && gameState === "RUNNING" && !player.isJumping) {
            // Skaczemy tylko jeśli dotyk jest w górnej połowie ekranu (tam gdzie gra)
            if(e.touches[0].clientY < window.innerHeight * 0.45) {
                player.vy = -12;
                player.isJumping = true;
            }
        }
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        if (gameState === "RUNNING") {
            if ((e.key === "ArrowUp" || e.key === "w" || e.key === " ") && !player.isJumping) {
                player.vy = -12; player.isJumping = true;
            }
        }
    });

    // POZOSTAŁE FUNKCJE CZATU
    function openChat() {
        if (kapibaraChat) {
            kapibaraChat.style.display = "flex";
            if (kapibaraInput) kapibaraInput.focus();
        }
    }

    const btnMisje = document.getElementById("btn-misje");
    if (btnMisje) {
        btnMisje.onclick = (e) => {
            e.preventDefault();
            startGraffitiGame();
        };
    }

    if (closeChat) { closeChat.onclick = () => kapibaraChat.style.display = "none"; }
    window.closePopup = () => { document.getElementById("popup").style.display = "none"; };

    function kapibaraAddMsg(text, sender="bot") {
        if (!kapibaraChatWindow) return;
        const div = document.createElement("div");
        div.className = `msg ${sender}`;
        div.innerText = text;
        kapibaraChatWindow.appendChild(div);
        kapibaraChatWindow.scrollTop = kapibaraChatWindow.scrollHeight;
    }

    if (kapibaraSend) {
        kapibaraSend.onclick = () => {
            const text = kapibaraInput.value.trim();
            if (!text) return;
            kapibaraAddMsg(text, "user");
            kapibaraInput.value = "";
            
            setTimeout(() => {
                let reply = "Zapytaj o LGC, Grosz albo legendy.";
                if (text.toLowerCase().includes("lgc")) reply = "LGC - Last Grosz Crew. Robimy swoje nocą.";
                if (text.toLowerCase().includes("grosz")) reply = "Ostatni Grosz – tu rządzi Kapibara.";
                kapibaraAddMsg(reply, "bot");
            }, 400);
        };
    }

    document.getElementById("btn-start").onclick = () => { openChat(); kapibaraAddMsg("SYSTEM: Gotowy na akcję?", "bot"); };
    document.getElementById("btn-mapa").onclick = () => { openChat(); kapibaraAddMsg("MAPA: Brak autoryzacji.", "bot"); };
    document.getElementById("btn-postacie").onclick = () => { openChat(); kapibaraAddMsg("SKŁAD: Heniek, LGC i Ty.", "bot"); };
    document.getElementById("btn-kontakt").onclick = () => { openChat(); kapibaraAddMsg("KONTAKT: Wrzuć panel na pociąg.", "bot"); };
});
