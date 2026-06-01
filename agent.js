// OBSŁUGA INTERAKCJI Z PRANIEM
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('pranie')) {
        document.querySelectorAll('.pranie').forEach(p => p.classList.remove('clicked'));
        e.target.classList.add('clicked');
        setTimeout(() => { e.target.classList.remove('clicked'); }, 3000);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("LGC Engine & Game Initialized");

    // Pobranie canvasu gry
    const canvas = document.getElementById('cloud-canvas');
    if (!canvas) {
        console.error("BŁĄD GRAFICZNY: Canvas nie został znaleziony w dokumencie HTML.");
        return; 
    }
    
    const ctx = canvas.getContext('2d');
    const PIXEL_SIZE = 4;

    // Paleta kolorów dla proceduralnych chmur pixelartowych
    const COLORS = {
        highlight: '#94a3b8',   
        base: '#475569',        
        shadowLight: '#334155', 
        shadowDark: '#1e293b'   
    };

    // Flagi stanów mechaniki gry
    let gameActive = false;
    let gameState = "RUNNING"; // RUNNING lub SPRAYING

    // Konfiguracja fizyki gracza
    let player = { x: 80, y: 0, w: 24, h: 48, vy: 0, isJumping: false };
    let obstacles = [];
    let gameTimer = 0;
    let requiredRunTime = 280; // Czas trwania ucieczki w klatkach (ok. 6-7 sekund)
    
    // Dane minigry bombingowej
    let spraySequence = [];
    let sprayIndex = 0;
    const keysPool = ['W', 'A', 'S', 'D'];

    // Baza nagród fabularnych
    const stories = [
        "LGC powstało jak kable zwisały nad blokami w 98. Kapibara wybrała mnie.",
        "Heniek z garaży mówi że LGC to nie crew, to rodzina. Kapibara potwierdza.",
        "Widzisz ten mural 'Start Osiedle Misja Kontakt'? To my go pilnowaliśmy całą noc.",
        "46 jeździ rzadko, ale kapibara zawsze zdąży. Mamy swoje skróty między blokami.",
        "Żabka na dole? Płacimy groszem, bo to Ostatni Grosz. Kapibara ma zniżkę stałego klienta."
    ];

    // Cache elementów DOM
    const mouth = document.getElementById("mouth");
    const kapibaraChat = document.getElementById("kapibaraChat");
    const kapibaraChatWindow = document.getElementById("kapibaraChatWindow");
    const kapibaraInput = document.getElementById("kapibaraInput");
    const kapibaraSend = document.getElementById("kapibaraSend");
    const closeChat = document.getElementById("closeChat");

    // Skalowanie okna gry
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.45;
        if (gameActive) {
            player.y = (canvas.height - 50) - player.h;
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ==========================================
    // KLASA CHMUR PIXEL ART (TRYB PASYWNY)
    // ==========================================
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

    // ==========================================
    // URUCHOMIENIE SILNIKA GRY RUNNERA
    // ==========================================
    function startGraffitiGame() {
        if (kapibaraChat) kapibaraChat.style.display = "none";
        const popup = document.getElementById("popup");
        if (popup) popup.style.display = "none";

        gameActive = true;
        gameState = "RUNNING";
        gameTimer = 0;
        obstacles = [];
        
        const groundY = canvas.height - 50;
        player.y = groundY - player.h; 
        player.vy = 0;
        player.isJumping = false;
        
        setTimeout(() => {
            if (kapibaraChat) kapibaraChat.style.display = "flex";
            kapibaraAddMsg("SYSTEM: Wjechałeś w tunele na Groszu... SOK-iści depczą po piętach! Biegnij! [Tapnij w grę / Strzałka w Górę = Skok]", "bot");
        }, 350);
    }

    function spawnObstacle() {
        if (gameState !== "RUNNING" || Math.random() > 0.025 || obstacles.length > 1) return;
        const groundY = canvas.height - 50;
        let isTrain = Math.random() > 0.4; 
        
        obstacles.push({
            x: canvas.width + 60,
            y: isTrain ? groundY - 38 : groundY - 70,
            w: isTrain ? 55 : 30,
            h: isTrain ? 38 : 10,
            type: isTrain ? "TRAIN" : "CABLE",
            color: isTrain ? "#1e3a8a" : "#facc15" 
        });
    }

    function initSpraySequence() {
        gameState = "SPRAYING";
        spraySequence = [];
        sprayIndex = 0;
        for (let i = 0; i < 5; i++) {
            spraySequence.push(keysPool[Math.floor(Math.random() * keysPool.length)]);
        }
        kapibaraAddMsg("LGC: Jesteś na miejscu! (Wersja mobilna maluje automatycznie... potrzymaj chwilę!)", "bot");
    }

    // GŁÓWNA PĘTLA GRAFICZNA
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!gameActive) {
            // RENDER PASYWNYCH CHMUR
            clouds.forEach((cloud, index) => {
                cloud.update();
                cloud.draw();
                if (cloud.x > canvas.width) clouds[index] = new DetailedPixelCloud(false);
            });
        } else {
            // RENDER AKTYWNEJ ROZGRYWKI
            const groundY = canvas.height - 50;

            ctx.fillStyle = "#0f172a"; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#475569";
            ctx.fillRect(0, groundY, canvas.width, 8);

            if (gameState === "RUNNING") {
                gameTimer++;
                
                // Grawitacja i ruch gracza
                player.y += player.vy;
                if (player.y < groundY - player.h) {
                    player.vy += 0.65; 
                } else {
                    player.y = groundY - player.h;
                    player.vy = 0;
                    player.isJumping = false;
                }

                // Rysowanie gracza (Pixel art bloczek)
                ctx.fillStyle = "#ec4899"; 
                ctx.fillRect(player.x, player.y, player.w, player.h);
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 3;
                ctx.strokeRect(player.x, player.y, player.w, player.h);
                
                // Daszek czapki grafficiarza
                ctx.fillStyle = "#facc15";
                ctx.fillRect(player.x - 4, player.y, player.w + 6, 8);

                spawnObstacle();

                // Obsługa przeszkód
                obstacles.forEach((obs) => {
                    obs.x -= 6.5; 
                    ctx.fillStyle = obs.color;
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

                    // Detekcja Kolizji AABB
                    if (player.x < obs.x + obs.w && player.x + player.w > obs.x &&
                        player.y < obs.y + obs.h && player.y + player.h > obs.y) {
                            gameActive = false;
                            if (kapibaraChat) kapibaraChat.style.display = "flex";
                            kapibaraAddMsg("SOK: Stój policja! Złapali Cię... Kliknij ponownie 'Misje', żeby spróbować jeszcze raz.", "bot");
                    }
                });

                // BEZPIECZNE FILTROWANIE TABLICY
                obstacles = obstacles.filter(obs => obs.x > -100);

                if (gameTimer > requiredRunTime) initSpraySequence();

                // HUD Paska postępu ucieczki
                ctx.fillStyle = "#1e293b"; ctx.fillRect(20, 15, canvas.width - 40, 8);
                ctx.fillStyle = "#22c55e"; ctx.fillRect(20, 15, ((gameTimer / requiredRunTime) * (canvas.width - 40)), 8);

            } else if (gameState === "SPRAYING") {
                // EKRAN BOMBINGU PANELU
                ctx.fillStyle = "#334155"; ctx.fillRect(30, 20, canvas.width - 60, canvas.height - 40);
                ctx.strokeStyle = "#fff"; ctx.strokeRect(30, 20, canvas.width - 60, canvas.height - 40);
                
                ctx.fillStyle = "#fff"; ctx.font = "bold 14px monospace";
                ctx.fillText("BOMBING PANELU LGC W TOKU...", canvas.width/2 - 110, canvas.height/2);
                
                // Zamknięcie misji z sukcesem
                setTimeout(() => {
                    if (gameActive && gameState === "SPRAYING") {
                        gameActive = false;
                        if (kapibaraChat) kapibaraChat.style.display = "flex";
                        kapibaraAddMsg("Mordo! Panel LGC skończony! Cały skład zmalowany w dziki wildstyle. Akcja czysta!", "bot");
                        
                        setTimeout(() => {
                            const popup = document.getElementById("popup");
                            const story = document.getElementById("story");
                            if (popup && story) {
                                popup.style.display = "block";
                                story.innerText = "MISJA ZALICZONA! " + stories[Math.floor(Math.random() * stories.length)];
                            }
                        }, 1200);
                    }
                }, 2000);
            }
        }
        requestAnimationFrame(animate);
    }
    animate();

    // SYSTEM SKOKU POD TABLETY (DOTYK W CANVAS)
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameActive && gameState === "RUNNING" && !player.isJumping) {
            player.vy = -12.5;
            player.isJumping = true;
        }
    }, { passive: false });

    // SYSTEM SKOKU POD KLAWIATURY (PC)
    window.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        if (gameState === "RUNNING") {
            if ((e.key === "ArrowUp" || e.key === "w" || e.key === " ") && !player.isJumping) {
                player.vy = -12.5; player.isJumping = true;
            }
        }
    });

    // ==========================================
    // CZAT I OBSŁUGA POZOSTAŁYCH PRZYCISKÓW MENU
    // ==========================================
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

    const capyEl = document.getElementById("capy");
    if (capyEl) { capyEl.onclick = openChat; }

    const lgcEl = document.getElementById("lgc-face");
    if (lgcEl) { lgcEl.onclick = openChat; }

    if (closeChat) { closeChat.onclick = () => kapibaraChat.style.display = "none"; }

    window.closePopup = () => {
        const popup = document.getElementById("popup");
        if (popup) popup.style.display = "none";
    };

    function kapibaraAddMsg(text, sender="bot") {
        if (!kapibaraChatWindow) return;
        const div = document.createElement("div");
        div.className = `msg ${sender}`;
        div.innerText = text;
        kapibaraChatWindow.appendChild(div);
        kapibaraChatWindow.scrollTop = kapibaraChatWindow.scrollHeight;
        
        if (sender === "bot" && mouth) {
            mouth.classList.add("talking");
            setTimeout(() => mouth.classList.remove("talking"), 1400);
        }
    }

    if (kapibaraSend) {
        kapibaraSend.onclick = () => {
            const text = kapibaraInput.value.trim();
            if (!text) return;
            kapibaraAddMsg(text, "user");
            kapibaraInput.value = "";
            
            setTimeout(() => {
                let reply = "Zapytaj mnie o LGC, Grosz, pociągi albo osiedlowe legendy.";
                const m = text.toLowerCase();
                if (m.includes("lgc")) reply = "LGC - Last Grosz Crew. Malujemy panele tam, gdzie SOK nie sięga.";
                if (m.includes("grosz") || m.includes("osiedle")) reply = "Ostatni Grosz ma swój klimat. Tunele kolejowe to nasze drugie podwórko.";
                if (m.includes("legenda") || m.includes("historia")) reply = stories[Math.floor(Math.random() * stories.length)];
                kapibaraAddMsg(reply, "bot");
            }, 400);
        };
    }

    if (kapibaraInput) {
        kapibaraInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); kapibaraSend.click(); } });
    }

    // Przypisania akcji pod pozostałe przyciski dolnego panelu menu
    document.getElementById("btn-start").onclick = () => { openChat(); kapibaraAddMsg("SYSTEM: Witamy na Groszu. Gotowy na akcję?", "bot"); };
    document.getElementById("btn-mapa").onclick = () => { openChat(); kapibaraAddMsg("MAPA: Tunele i skróty między bocznicami Częstochowa-Raków są zablokowane dla obcych.", "bot"); };
    document.getElementById("btn-postacie").onclick = () => { openChat(); kapibaraAddMsg("SKŁAD: Ty (Writer), Heniek z garaży oraz Kapibara LGC Certified.", "bot"); };
    document.getElementById("btn-kontakt").onclick = () => { openChat(); kapibaraAddMsg("KONTAKT: Zostaw wrzut na pociągu, sami Cię znajdziemy.", "bot"); };
});
