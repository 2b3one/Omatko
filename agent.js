document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. SILNIK ULTRA-DETALICZNYCH CHMUREK (CANVAS)
    // ==========================================
    const canvas = document.getElementById('cloud-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const PIXEL_SIZE = 4; // Rozmiar piksela gry

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight * 0.45;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

                const COLORS = {
            highlight: '#94a3b8',   // Jasny, ołowiany szary (czubki chmur łapiące resztki światła)
            base: '#475569',        // Ciemny, betonowy grafit (główna masa chmury)
            shadowLight: '#334155', // Głęboki, burzowy granat/szary
            shadowDark: '#1e293b'   // Najciemniejszy, niemal czarny spód chmury (zaraz runie ulewa)
        };


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
                this.speed = Math.random() * 0.25 + 0.15; // Prędkość sunięcia
                this.x = isInitial ? (Math.random() * (canvas.width + this.width * PIXEL_SIZE) - this.width * PIXEL_SIZE) : -this.width * PIXEL_SIZE;
                this.y = Math.random() * (canvas.height - this.height * PIXEL_SIZE - 40) + 10;
                this.opacity = Math.random() * 0.25 + 0.65;

                this.generatePixelMatrix();
            }

            generatePixelMatrix() {
                for (let x = 0; x < this.width; x++) {
                    for (let y = 0; y < this.height; y++) {
                        let inside = false;
                        let minDistToTop = 999;
                        let minDistToBottom = 999;

                        for (let puff of this.puffs) {
                            const dx = x - puff.cx;
                            const dy = y - puff.cy;
                            const dist = Math.sqrt(dx*dx + dy*dy);
                            
                            if (dist <= puff.r) {
                                inside = true;
                                let distTop = puff.r - (puff.cy - y);
                                let distBottom = puff.r - (y - puff.cy);
                                if (distTop < minDistToTop) minDistToTop = distTop;
                                if (distBottom < minDistToBottom) minDistToBottom = distBottom;
                            }
                        }

                        if (inside) {
                            this.grid[`${x},${y}`] = { x, y, rawTop: minDistToTop, rawBottom: minDistToBottom };
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

                    if (relativeY < 0.15) {
                        finalColor = COLORS.highlight;
                    } else if (relativeY >= 0.15 && relativeY < 0.28) {
                        finalColor = ((p.x + p.y) % 2 === 0) ? COLORS.highlight : COLORS.base;
                    } else if (relativeY >= 0.28 && relativeY < 0.55) {
                        finalColor = COLORS.base;
                    } else if (relativeY >= 0.55 && relativeY < 0.68) {
                        finalColor = ((p.x + p.y) % 2 === 0) ? COLORS.base : COLORS.shadowLight;
                    } else if (relativeY >= 0.68 && relativeY < 0.85) {
                        finalColor = COLORS.shadowLight;
                    } else {
                        finalColor = COLORS.shadowDark;
                    }

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

                function animateClouds() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!gameActive) {
                // STANDARDOWY TRYB: Rysujemy burzowe chmury na niebie
                clouds.forEach((cloud, index) => {
                    cloud.update();
                    cloud.draw();
                    if (cloud.x > canvas.width) {
                        clouds[index] = new DetailedPixelCloud(false);
                    }
                });
            } else {
                // HARDCORE MODE: Ekran Gry Tunnel Runner
                const groundY = canvas.height - 50;

                // 1. Rysowanie tła mrocznego tunelu (Pixel Art)
                ctx.fillStyle = "#0f172a"; // Ciemne tło
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Linie torów kolejowych
                ctx.fillStyle = "#475569";
                ctx.fillRect(0, groundY, canvas.width, 8);
                ctx.fillStyle = "#334155";
                ctx.fillRect(0, groundY + 15, canvas.width, 6);

                if (gameState === "RUNNING") {
                    gameTimer++;
                    
                    // Fizyka gracza (Grawitacja)
                    player.y += player.vy;
                    if (player.y < groundY - player.h) {
                        player.vy += 0.6; // Grawitacja podciągająca w dół
                    } else {
                        player.y = groundY - player.h;
                        player.vy = 0;
                        player.isJumping = false;
                    }

                    // Obsługa wślizgu
                    if (player.isDucking) {
                        player.duckTimer--;
                        if (player.duckTimer <= 0) player.isDucking = false;
                    }

                    // Rysowanie pixelartowego grafficiarza
                    ctx.fillStyle = "#ec4899"; // Neonowa bluza
                    let currentH = player.isDucking ? player.h / 2 : player.h;
                    let currentY = player.isDucking ? player.y + player.h / 2 : player.y;
                    ctx.fillRect(player.x, currentY, player.w, currentH);
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 3;
                    ctx.strokeRect(player.x, currentY, player.w, currentH);
                    
                    // Czapka z daszkiem (Graffiti style)
                    ctx.fillStyle = "#facc15";
                    ctx.fillRect(player.x - 4, currentY, player.w + 6, 8);

                    // Generowanie i ruch przeszkód
                    spawnObstacle();
                    obstacles.forEach((obs, index) => {
                        obs.x -= 5.5; // Prędkość przeszkód (zapierdalanie pociągów)
                        
                        // Rysowanie przeszkody z grubym konturem
                        ctx.fillStyle = obs.color;
                        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                        ctx.strokeStyle = "#000000";
                        ctx.lineWidth = 3;
                        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

                        // Detale okien pociągu EN57
                        if (obs.type === "TRAIN") {
                            ctx.fillStyle = "#67e8f9";
                            ctx.fillRect(obs.x + 8, obs.y + 8, 12, 10);
                            ctx.fillRect(obs.x + 28, obs.y + 8, 12, 10);
                        }

                        // KOLIZJA (Hitbox oparty o ostre piksele)
                        let pY = currentY;
                        let pH = currentH;
                        if (player.x < obs.x + obs.w && player.x + player.w > obs.x &&
                            pY < obs.y + obs.h && pY + pH > obs.y) {
                                // Gleba! SOK-iści łapią pisarza
                                gameActive = false;
                                openChat();
                                addMsg("SOK: Stój policja! Złapali Cię na gorącym uczynku w tunelu... Spróbuj ponownie klikając 'Misje'.", "bot");
                        }

                        // Usuwanie przeszkód za ekranem
                        if (obs.x < -100) obstacles.splice(index, 1);
                    });

                    // Sprawdzenie czy dobiegliśmy do zaparkowanego składu LGC
                    if (gameTimer > requiredRunTime) {
                        initSpraySequence();
                    }

                    // Pasek postępu ucieczki na górze ekranu
                    ctx.fillStyle = "#1e293b";
                    ctx.fillRect(20, 20, canvas.width - 40, 10);
                    ctx.fillStyle = "#22c55e";
                    ctx.fillRect(20, 20, ((gameTimer / requiredRunTime) * (canvas.width - 40)), 10);

                } 
                else if (gameState === "SPRAYING") {
                    // 3. TRYB BOMBINGU (MALOWANIE PANELU)
                    ctx.fillStyle = "#334155"; // Bok pociągu jako tło akcji
                    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 100);
                    ctx.strokeStyle = "#000";
                    ctx.lineWidth = 5;
                    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 100);

                    // Ślady niedokończonego graffiti (Szkic/Outline)
                    ctx.font = "bold 40px 'Press Start 2P', monospace";
                    ctx.fillStyle = "rgba(0,0,0,0.2)";
                    ctx.fillText("LAST GROSZ CREW", canvas.width/2 - 220, canvas.height/2);
                    
                    // Wypełnianie kolorem na podstawie postępu sekwencji
                    ctx.fillStyle = "#a855f7"; // Neonowy wrzut
                    ctx.fillText("LAST GROSZ CREW".substring(0, sprayIndex * 3), canvas.width/2 - 220, canvas.height/2);

                    // Wyświetlanie klawiszy graffiti do wklepania (HUD)
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "20px 'Press Start 2P', monospace";
                    ctx.fillText("WSTUKAJ KOD GRAFFITI:", canvas.width/2 - 180, canvas.height/2 + 50);

                    // Rysowanie klocków z literami
                    for (let i = 0; i < spraySequence.length; i++) {
                        let isDone = i < sprayIndex;
                        ctx.fillStyle = isDone ? "#22c55e" : "#ef4444";
                        ctx.fillRect(canvas.width/2 - 120 + (i * 40), canvas.height/2 + 80, 32, 32);
                        ctx.strokeStyle = "#000";
                        ctx.strokeRect(canvas.width/2 - 120 + (i * 40), canvas.height/2 + 80, 32, 32);

                        ctx.fillStyle = "#fff";
                        ctx.font = "16px 'Press Start 2P', monospace";
                        ctx.fillText(spraySequence[i], canvas.width/2 - 112 + (i * 40), canvas.height/2 + 102);
                    }
                }
            }

            requestAnimationFrame(animateClouds);
        }


    // ==========================================
    // 2. LOGIKA INTERAKCJI, CZATU I POPUPOW LGC
    // ==========================================
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('pranie')) {
            document.querySelectorAll('.pranie').forEach(p => p.classList.remove('clicked'));
            e.target.classList.add('clicked');
            setTimeout(() => e.target.classList.remove('clicked'), 3000);
        }
    });

    const stories = [
        "LGC powstało jak kable zwisały nad blokami w 98. Kapibara wybrała mnie.",
        "Heniek z garaży mówi że LGC to nie crew, to rodzina. Kapibara potwierdza.",
        "Widzisz ten mural 'Start Osiedle Misja Kontakt'? To my go pilnowaliśmy całą noc.",
        "46 jeździ rzadko, ale kapibara zawsze zdąży. Mamy swoje skróty między blokami.",
        "Żabka na dole? Płacimy groszem, bo to Ostatni Grosz. Kapibara ma zniżkę stałego klienta."
    ];

    const mouth = document.getElementById("mouth");
    const kapibaraChat = document.getElementById("kapibaraChat");
    const chatWindow = document.getElementById("kapibaraChatWindow");
    const input = document.getElementById("kapibaraInput");
    const btnSend = document.getElementById("kapibaraSend");

    function openChat() {
        if (kapibaraChat) {
            kapibaraChat.style.display = "flex";
            if (input) input.focus();
        }
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

    // Obsługa misji
    
        // ==========================================
    // 3. MINIGRA: GRAFFITI RUNNER (ODPALANA PRZEZ MISJE)
    // ==========================================
    const stories = [
        "LGC powstało jak kable zwisały nad blokami w 98. Kapibara wybrała mnie.",
        "Heniek z garaży mówi że LGC to nie crew, to rodzina. Kapibara potwierdza.",
        "Widzisz ten mural 'Start Osiedle Misja Kontakt'? To my go pilnowaliśmy całą noc.",
        "46 jeździ rzadko, ale kapibara zawsze zdąży. Mamy swoje skróty między blokami.",
        "Żabka na dole? Płacimy groszem, bo to Ostatni Grosz. Kapibara ma zniżkę stałego klienta."
    ];

    let gameActive = false;
    let gameState = "RUNNING"; // "RUNNING" lub "SPRAYING"

    // Parametry gracza
    let player = { x: 80, y: 0, w: 24, h: 48, vy: 0, isJumping: false, isDucking: false, duckTimer: 0 };
    let obstacles = [];
    let gameScore = 0;
    let gameTimer = 0;
    let requiredRunTime = 400; // Ile klatek trzeba biec (ok. 8-10 sekund), żeby dojść do pociągu
    
    // Parametry minigry graffiti
    let spraySequence = [];
    let sprayIndex = 0;
    const keysPool = ['W', 'A', 'S', 'D'];

    function startGraffitiGame() {
        gameActive = true;
        gameState = "RUNNING";
        gameScore = 0;
        gameTimer = 0;
        obstacles = [];
        player.y = canvas.height - 90; // Pozycja na ziemi w tunelu
        player.vy = 0;
        player.isJumping = false;
        player.isDucking = false;
        
        // Ukrywamy popup na czas gry, jeśli był otwarty
        const popup = document.getElementById("popup");
        if (popup) popup.style.display = "none";

        addMsg("SYSTEM: Wjechałeś w tunele kolejowe na Groszu... SOK-iści depczą po piętach! Biegnij! (Strzałka w Górę = Skok, Strzałka w Dół = Wślizg)", "bot");
    }

    // Generowanie losowych przeszkód w tunelu (Pociąg lub Niski Kabel)
    function spawnObstacle() {
        if (gameState !== "RUNNING" || Math.random() > 0.03 || obstacles.length > 2) return;
        
        let isTrain = Math.random() > 0.4; // Pociąg (skaczemy nad nim) czy kabel (wślizg pod nim)
        obstacles.push({
            x: canvas.width + 50,
            y: isTrain ? canvas.height - 90 : canvas.height - 140,
            w: isTrain ? 60 : 30,
            h: isTrain ? 40 : 15,
            type: isTrain ? "TRAIN" : "CABLE",
            color: isTrain ? "#1e3a8a" : "#facc15" // Klasyczny żółto-niebieski skład EN57
        });
    }

    // Inicjalizacja sekwencji tagowania graffiti
    function initSpraySequence() {
        gameState = "SPRAYING";
        spraySequence = [];
        sprayIndex = 0;
        for (let i = 0; i < 6; i++) {
            spraySequence.push(keysPool[Math.floor(Math.random() * keysPool.length)]);
        }
        addMsg("LGC: Jesteś na miejscu! Szybko wrzucaj panel zanim nadjadą! Wklepuj na klawiaturze litery, które widzisz na ekranie!", "bot");
    }

    // Obsługa sterowania z klawiatury
    window.addEventListener('keydown', (e) => {
        if (!gameActive) return;

        if (gameState === "RUNNING") {
            if ((e.key === "ArrowUp" || e.key === "w" || e.key === " ") && !player.isJumping && !player.isDucking) {
                player.vy = -12; // Siła skoku
                player.isJumping = true;
            }
            if ((e.key === "ArrowDown" || e.key === "s") && !player.isJumping) {
                player.isDucking = true;
                player.duckTimer = 25; // Czas trwania wślizgu w klatkach
            }
        } 
        else if (gameState === "SPRAYING") {
            let pressedKey = e.key.toUpperCase();
            if (pressedKey === spraySequence[sprayIndex]) {
                sprayIndex++;
                gameScore += 20;
                if (sprayIndex >= spraySequence.length) {
                    // Sukces! Panel zrobiony
                    gameActive = false;
                    openChat();
                    addMsg("Mordo! Panel LGC skończony! Cały skład zmalowany w gruby wildstyle. Akcja idealna. Znikamy stąd!", "bot");
                    // Wyświetlenie losowej historii jako nagrody
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
                // Skucha w sekwencji - cofka o jeden krok
                if (sprayIndex > 0) sprayIndex--;
            }
        }
    });

    // Podpięcie pod przycisk "Misje" w menu
    const btnMisje = document.getElementById("btn-misje");
    if (btnMisje) {
        btnMisje.onclick = () => {
            startGraffitiGame();
        };
    }

    
    const btnMisje = document.getElementById("btn-misje");
    if (btnMisje) {
        btnMisje.onclick = () => {
            const popup = document.getElementById("popup");
            const story = document.getElementById("story");
            if (popup && story) {
                popup.style.display = "block";
                story.innerText = stories[Math.floor(Math.random() * stories.length)];
            }
        };
    }

    // Dolne menu
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
