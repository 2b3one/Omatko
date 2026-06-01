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
            highlight: '#ffffff',   // Czubki kłębów
            base: '#cbd5e1',        // Główny kolor
            shadowLight: '#94a3b8', // Pierwszy cień
            shadowDark: '#64748b'   // Głęboki cień na dole
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
            clouds.forEach((cloud, index) => {
                cloud.update();
                cloud.draw();
                if (cloud.x > canvas.width) {
                    clouds[index] = new DetailedPixelCloud(false);
                }
            });
            requestAnimationFrame(animateClouds);
        }
        animateClouds();
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
