document.addEventListener('DOMContentLoaded', () => {
    // Interakcja prania na kliknięcie
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('pranie')) {
            document.querySelectorAll('.pranie').forEach(p => p.classList.remove('clicked'));
            e.target.classList.add('clicked');
            setTimeout(() => e.target.classList.remove('clicked'), 3000);
        }
    });

    const stories = [
        "LGC powstało jak kable zwisały nad blokami w 98. Kapibara wybrała mnie.[span_0](start_span)[span_0](end_span)",
        "Heniek z garaży mówi że LGC to nie crew, to rodzina. Kapibara potwierdza.[span_1](start_span)[span_1](end_span)",
        "Widzisz ten mural 'Start Osiedle Misja Kontakt'? To my go pilnowaliśmy całą noc.[span_2](start_span)[span_2](end_span)",
        "46 jeździ rzadko, ale kapibara zawsze zdąży. Mamy swoje skróty między blokami.[span_3](start_span)[span_3](end_span)",
        "Żabka na dole? Płacimy groszem, bo to Ostatni Grosz. Kapibara ma zniżkę stałego klienta.[span_4](start_span)[span_4](end_span)"
    ];

    const mouth = document.getElementById("mouth");
    const kapibaraChat = document.getElementById("kapibaraChat");
    const chatWindow = document.getElementById("kapibaraChatWindow");
    const input = document.getElementById("kapibaraInput");
    const btnSend = document.getElementById("kapibaraSend");

    function openChat() {
        kapibaraChat.style.display = "flex";
        input.focus();
    }

    window.closePopup = () => {
        document.getElementById("popup").style.display = "none";
    };

    document.getElementById("capy").onclick = openChat;
    document.getElementById("lgc-face").onclick = openChat;
    document.getElementById("closeChat").onclick = () => kapibaraChat.style.display = "none";

    // Losowanie misji osiedlowych
    document.getElementById("btn-misje").onclick = () => {
        document.getElementById("popup").style.display = "block";
        document.getElementById("story").innerText = stories[Math.floor(Math.random() * stories.length)];
    };

    // Obsługa dolnego menu bota
    document.getElementById("btn-start").onclick = () => { openChat(); addMsg("Wkrótce nowe misje na Groszu.[span_5](start_span)[span_5](end_span)", "bot"); };
    document.getElementById("btn-mapa").onclick = () => { openChat(); addMsg("Mapa – tylko wtajemniczeni znają skróty między blokami.[span_6](start_span)[span_6](end_span)", "bot"); };
    document.getElementById("btn-postacie").onclick = () => { openChat(); addMsg("Heniek, LGC, Kapibara. Reszta to tło.[span_7](start_span)[span_7](end_span)", "bot"); };
    document.getElementById("btn-kontakt").onclick = () => { openChat(); addMsg("Kontakt: LGC nie odbiera nieznanych numerów.[span_8](start_span)[span_8](end_span)", "bot"); };

    function addMsg(text, sender = "user") {
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

    btnSend.onclick = () => {
        const txt = input.value.trim();
        if (!txt) return;
        addMsg(txt, "user");
        input.value = "";

        setTimeout(() => {
            let reply = "Nie wszystko mogę mówić na głos, wiesz jak jest. Zapytaj o LGC, Grosz, bloki albo legendy.[span_9](start_span)[span_9](end_span)";
            const m = txt.toLowerCase();
            if (m.includes("lgc")) reply = "LGC - Last Grosz Crew. Kapibara dołączyła pierwsza, ja drugi.[span_10](start_span)[span_10](end_span)";
            if (m.includes("kapibara")) reply = "Tak, to ona. Najbardziej osiedlowa kapibara w Polsce. LGC certified.[span_11](start_span)[span_11](end_span)";
            if (m.includes("grosz") || m.includes("osiedle")) reply = "Ostatni Grosz to labirynt bloków i garaży. Jak nie jesteś stąd, to się zgubisz.[span_12](start_span)[span_12](end_span)";
            if (m.includes("legenda") || m.includes("historia")) reply = stories[Math.floor(Math.random() * stories.length)];
            
            addMsg(reply, "bot");
        }, 400);
    };

    input.addEventListener("keydown", (e) => { if (e.key === "Enter") btnSend.click(); });

    // Parallax dla myszy
    document.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 768) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        document.getElementById("scene").style.transform = `translate(${x}px, ${y}px) scale(1.04)`;
    });
});
