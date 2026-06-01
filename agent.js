document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // GLOBALNE ZMIENNE SILNIKA GRAFIKI I GRY
    // ==========================================
    const canvas = document.getElementById('cloud-canvas');
    if (!canvas) return; 
    
    const ctx = canvas.getContext('2d');
    const PIXEL_SIZE = 4; // Rozmiar piksela gry

    // Kolory chmur (Burzowy grafit)
    const COLORS = {
        highlight: '#94a3b8',   
        base: '#475569',        
        shadowLight: '#334155', 
        shadowDark: '#1e293b'   
    };

    // Stany gry
    let gameActive = false;
    let gameState = "RUNNING"; // "RUNNING" lub "SPRAYING"

    // Parametry gracza
    let player = { x: 80, y: 0, w: 24, h: 48, vy: 0, isJumping: false, isDucking: false, duckTimer: 0 };
    let obstacles = [];
    let gameTimer = 0;
    let requiredRunTime = 300; // Czas biegu (ok. 6-7 sekund dla płynności)
    
    // Parametry minigry graffiti
    let spraySequence = [];
    let sprayIndex = 0;
    const keysPool = ['W', 'A', 'S', 'D'];

    // Historie LGC
    const stories = [
        "LGC powstało jak kable zwisały nad blokami w 98. Kapibara wybrała mnie.",
        "Heniek z garaży mówi że LGC to nie crew, to rodzina. Kapibara potwierdza.",
        "Widzisz ten mural 'Start Osiedle Misja Kontakt'? To my go pilnowaliśmy całą noc.",
        "46 jeździ rzadko, ale kapibara zawsze zdąży. Mamy swoje skróty między blokami.",
        "Żabka na dole? Płacimy groszem, bo to Ostatni Grosz. Kapibara ma zniżkę stałego klienta."
    ];

    // Pobranie elementów HTML (Zabezpieczone przed błędami null)
    const mouth = document.getElementById("mouth");
    const kapibaraChat = document.getElementById("kapibaraChat");
    const chatWindow = document.getElementById("kapibaraChatWindow");
    const input = document.getElementById("kapibaraInput");
    const btnSend = document.getElementById("kapibaraSend");

    // Dopasowanie rozmiaru płótna
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.45;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ==========================================
    // GENERATOR CHMUR (TRYB PASYWNY)
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
                this.puffs.push({
                    cx: currentX + radius,
                    cy: 12 + heightOffset,
                    r: radius
                });
                currentX += Math.floor(radius * 1.3);
            }
            
            this.width = currentX + 10;
            this.height = 30;
            this.speed = Math.random() * 0.25 + 0.15;
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
                        const dx = x - puff.cx;
                        const dy = y - puff.cy;
                        if (Math.sqrt(dx*dx + dy*dy) <= puff.r) {
                            inside = true;
                            break;
                        }
                    }

                    if (inside) {
                        this.grid[`${x},${y}`] = { x, y };
                    }
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

        update() {
            this.x += this.speed;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.imageSmoothingEnabled = false;

            for (let key in this.grid) {
                const block = this.grid[key];
                ctx.fillStyle = block.color;
                ctx.fillRect(
                    Math.round(this.x + block.x * PIXEL_SIZE), 
                    Math.round(this.y + block.y * PIXEL_SIZE), 
                    PIXEL_SIZE, 
                    PIXEL_SIZE
                );
            }
            ctx.restore();
        }
    }

    const cloudCount = 4;
    let clouds = [];
    for (let i = 0; i < cloudCount; i++) {
        clouds.push(new DetailedPixelCloud(true));
    }

    // ==========================================
    // LOGIKA URUCHAMIANIA MINIGRY GRAFFITI
    // ==========================================
    function startGraffitiGame() {
        if (kapibaraChat) kapibaraChat.style.display = "none";
        const popup = document.getElementById("popup");
        if (popup) popup.style.display = "none";

        gameActive = true;
        gameState = "RUNNING";
        gameTimer = 0;
        obstacles = [];
        player.y = canvas.height - 90; 
        player.vy = 0;
        player.isJumping = false;
        player.isDucking = false;
        
        setTimeout(() => {
            if (kapibaraChat) kapibaraChat.style.display = "flex";
            addMsg("SYSTEM: Wjechałeś w tunele na Groszu... SOK-iści depczą po piętach! Biegnij! [Strzałka w Górę = Skok, Strzałka w Dół = Wślizg]", "bot");
        }, 200);
    }

    function spawnObstacle() {
        if (gameState !== "RUNNING" || Math.random() > 0.02 || obstacles.length > 2) return;
        
        let isTrain = Math.random() > 0.4; 
        obstacles.push({
            x: canvas.width + 50,
            y: isTrain ? canvas.height - 90 : canvas.height - 130,
            w: isTrain ? 60 : 35,
            h: isTrain ? 40 : 12,
            type: isTrain ? "TRAIN" : "CABLE",
            color: isTrain ? "#1e3a8a" : "#facc15" 
        });
    }

    function initSpraySequence() {
        gameState = "SPRAYING";
        spraySequence = [];
        sprayIndex = 0;
        for (let i = 0; i < 6; i++) {
            spraySequence.push(keysPool[Math.floor(Math.random() * keysPool.length)]);
        }
        addMsg("LGC: Jesteś na miejscu! Szybko wrzucaj panel! Wklepuj na klawiaturze litery z ekranu!", "bot");
    }

    // ==========================================
    // GŁÓWNA PĘTLA RENDEROWANIA (ANIMATE)
    // ==========================================
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!gameActive) {
            // TRYB CHMUR
            clouds.forEach((cloud, index) => {
                cloud.update();
                cloud.draw();
                if (cloud.x > canvas.width) {
                    clouds[index] = new DetailedPixelCloud(false);
                }
            });
        } else {
            // TRYB GRAFFITI RUNNER
            const groundY = canvas.height - 50;

            ctx.fillStyle = "#0f172a"; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "#475569";
            ctx.fillRect(0, groundY, canvas.width, 8);
            ctx.fillStyle = "#334155";
            ctx.fillRect(0, groundY + 15, canvas.width, 6);

            if (gameState === "RUNNING") {
                gameTimer++;
                
                // Fizyka
                player.y += player.vy;
                if (player.y < groundY - player.h) {
                    player.vy += 0.6; 
                } else {
                    player.y = groundY - player.h;
                    player.vy = 0;
                    player.isJumping = false;
                }

                if (player.isDucking) {
                    player.duckTimer--;
                    if (player.duckTimer <= 0) player.isDucking = false;
                }

                // Gracz
                ctx.fillStyle = "#ec4899"; 
                let currentH = player.isDucking ? player.h / 2 : player.h;
                let currentY = player.isDucking ? player.y + player.h / 2 : player.y;
                ctx.fillRect(player.x, currentY, player.w, currentH);
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 3;
                ctx.strokeRect(player.x, currentY, player.w, currentH);
                
                ctx.fillStyle = "#facc15";
                ctx.fillRect(player.x - 4, currentY, player.w + 6, 8);

                spawnObstacle();

                // Ruch i filtrowanie (BEZPIECZNE USUNIĘCIE BEZ ZAPĘTLENIA)
                obstacles.forEach((obs) => {
                    obs.x -= 6; 
                    
                    ctx.fillStyle = obs.color;
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 3;
                    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

                    if (obs.type === "TRAIN") {
                        ctx.fillStyle = "#67e8f9";
                        ctx.fillRect(obs.x + 8, obs.y + 8, 12, 10);
                        ctx.fillRect(obs.x + 28, obs.y + 8, 12, 10);
                    }

                    // Kolizje
                    if (player.x < obs.x + obs.w && player.x + player.w > obs.x &&
                        currentY < obs.y + obs.h && currentY + currentH > obs.y) {
                            gameActive = false;
                            if (kapibaraChat) kapibaraChat.style.display = "flex";
                            addMsg("SOK: Stój policja! Złapali Cię... Kliknij ponownie 'Misje', żeby spróbować jeszcze raz.", "bot");
                    }
                });

                // Usuwamy przeszkody, które wyleciały poza ekran po zakończeniu iteracji
                obstacles = obstacles.filter(obs => obs.x > -100);

                if (gameTimer > requiredRunTime) {
                    initSpraySequence();
                }

                // HUD progresu
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(20, 20, canvas.width - 40, 10);
                ctx.fillStyle = "#22c55e";
                ctx.fillRect(20, 20, ((gameTimer / requiredRunTime) * (canvas.width - 40)), 10);

            } 
            else if (gameState === "SPRAYING") {
                ctx.fillStyle = "#334155"; 
                ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 100);
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 5;
                ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 100);

                ctx.font = "bold 24px monospace";
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.fillText("LAST GROSZ CREW", canvas.width/2 - 140, canvas.height/2 - 10);
                
                ctx.fillStyle = "#a855f7"; 
                ctx.fillText("LAST GROSZ CREW".substring(0, sprayIndex * 3), canvas.width/2 - 140, canvas.height/2 - 10);

                ctx.fillStyle = "#ffffff";
                ctx.font = "14px monospace";
                ctx.fillText("WSTUKAJ KOD GRAFFITI:", canvas.width/2 - 100, canvas.height/2 + 30);

                for (let i = 0; i < spraySequence.length; i++) {
                    let isDone = i < sprayIndex;
                    ctx.fillStyle = isDone ? "#22c55e" : "#ef4444";
                    ctx.fillRect(canvas.width/2 - 110 + (i * 38), canvas.height/2 + 50, 28, 28);
                    ctx.strokeStyle = "#000";
                    ctx.strokeRect(canvas.width/2 - 110 + (i * 38), canvas.height/2 + 50, 28, 28);

                    ctx.fillStyle = "#fff";
                    ctx.font = "12px monospace";
                    ctx.fillText(spraySequence[i], canvas.width/2 - 101 + (i * 38), canvas.height/2 + 69);
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();

    // ==========================================
    // STEROWANIE KLAWIATURĄ
    // ==========================================
    window.addEventListener('keydown', (e) => {
        if (!gameActive) return;

        if (gameState === "RUNNING") {
            if ((e.key === "ArrowUp" || e.key === "w" || e.key === " ") && !player.isJumping && !player.isDucking) {
                player.vy = -12; 
                player.isJumping = true;
            }
            if ((e.key === "ArrowDown" || e.key === "s") && !player.isJumping) {
                player.isDucking = true;
                player.duckTimer = 22; 
            }
        } 
        else if (gameState === "SPRAYING") {
            let pressedKey = e.key.toUpperCase();
            if (pressedKey === spraySequence[sprayIndex]) {
                sprayIndex++;
                if (sprayIndex >= spraySequence.length) {
                    gameActive = false;
                    if (kapibaraChat) kapibaraChat.style.display = "flex";
                    addMsg("Mordo! Panel LGC skończony! Cały skład zmalowany w gruby wildstyle. Akcja idealna!", "bot");
                    
                    setTimeout(() => {
                        const popup = document.getElementById("popup");
                        const story = document.getElementById("story");
                        if (popup && story) {
                            popup.style.display = "block";
                            story.innerText = "MISJA ZALICZONA! " + stories[Math.floor(Math.random() * stories.length)];
                        }
                    }, 1500);
                }
            } else if (keysPool.includes(pressedKey)) {
                if (sprayIndex > 0) sprayIndex--;
            }
        }
    });

    // ==========================================
    // OBSŁUGA MENU
    // ==========================================
    function openChat() {
        if (kapibaraChat) {
            kapibaraChat.style.display = "flex";
            if (input) input.focus();
        }
    }

    const btnMisje = document.getElementById("btn-misje");
    if (btnMisje) {
        btnMisje.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            startGraffitiGame();
        };
    }

    window.closePopup = () => {
        const popup = document.getElementById("popup");
        if (popup) popup.style.display = "none";
    };

    const capy = document.getElementById("capy");
    const lgcFace = document.getElementById("lgc-face");
    const closeChat = document.getElementById("closeChat");

    if (capy) capy.onclick = openChat;
    if (lgcFace) lgcFace.onclick = openChat;
    if (closeChat) closeChat.onclick = () => { if (kapibaraChat) kapibaraChat.style.display = "none"; };

    const btnStart = document.getElementById("btn-start");
    if (btnStart) btnStart.onclick = () => { openChat(); addMsg("Wkrótce nowe misje na Groszu.", "bot"); };

    const btnMapa = document.getElementById("btn-mapa");
    if (btnMapa) btnMapa.onclick = () => { openChat(); addMsg("Mapa – tylko wtajemniczeni znają skróty między blokami.", "bot"); };

    const btnPostacie = document.getElementById("btn-postacie");
    if (btnPostacie) btnPostacie.onclick = () => { openChat(); addMsg("Heniek, LGC, Kapibara. Reszta to tło.", "bot"); };

    const btnKontakt = document.getElementById("btn-kontakt");
    if (btnKontakt) btnKontakt.onclick = () => { openChat(); addMsg("Kontakt: LGC nie odbiera nieznanych numerów.", "bot"); };

    function addMsg(text, sender = "user") {
        if (!chatWindow) return;
        const div = document.createElement("div");
        div.className = `msg ${sender}`;
        div.innerText = text;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        if (sender === "bot" && mouth) {
            mouth.classList.add("talking");
            setTimeout(() => mouth.classList.remove("talking"), Math.min(text.length * 60, 2500));
        }
    }

    if (btnSend) {
        btnSend.onclick = () => {
            if (!input) return;
            const txt = input.value.trim();
            if (!txt) return;
            addMsg(txt, "user");
            input.value = "";

            setTimeout(() => {
                let reply = "Nie wszystko mogę mówić na głos, wiesz jak jest. Zapytaj o LGC, Grosz, bloki albo legendy.";
                const m = txt.toLowerCase();
                if (m.includes("lgc")) reply = "LGC - Last Grosz Crew. Kapibara dołączyła pierwsza, ja drugi.";
                if (m.includes("kapibara")) reply = "Tak, to ona. Najbardziej osiedlowa kapibara w Polsce. LGC certified.";
                if (m.includes("grosz") || m.includes("osiedle")) reply = "Ostatni Grosz to labirynt bloków i garaży. Jak nie jesteś stąd, to się zgubisz.";
                if (m.includes("legenda") || m.includes("historia")) reply = stories[Math.floor(Math.random() * stories.length)];
                
                addMsg(reply, "bot");
            }, 400);
        };
    }

    if (input) {
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") btnSend.click(); });
    }

    // Parallax
    document.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 768) return;
        const scene = document.getElementById("scene");
        if (scene) {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            scene.style.transform = `translate(${x}px, ${y}px) scale(1.04)`;
        }
    });
});
