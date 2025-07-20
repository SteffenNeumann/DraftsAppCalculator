// App-Kosten Diagramm-Generator (überarbeitet, dynamisch, validiert)
var p = Prompt.create();
p.title = "💰 App-Kosten Diagramm-Generator";
p.message = "Erstellen Sie Diagramme für Ihre App-Ausgaben";
p.addSelect("diagrammTyp", "Diagramm-Typ:", [
    "Balkendiagramm (Apps)", 
    "Säulendiagramm (Monatsverlauf)", 
    "Liniendiagramm (Kostenverlauf)",
    "Kreisdiagramm (Kategorien)"
], ["Balkendiagramm (Apps)"], false);
p.addButton("Weiter");
if (p.show()) {
    var typ = p.fieldValues["diagrammTyp"];
    // ------------------ 1. Balkendiagramm (Apps) --------------------
    if (typ == "Balkendiagramm (Apps)") {
        var p2 = Prompt.create();
        p2.title = "📊 App-Kosten Balkendiagramm";
        p2.message = "Geben Sie beliebig viele Apps ein (Komma-getrennt).";
        p2.addTextField("appNames", "App-Namen:", "Netflix,Spotify,Adobe CC");
        p2.addTextField("preise", "Preise (€):", "12.99,9.99,59.99");
        p2.addTextField("intervalle", "Intervall (M/J):", "M,M,J");
        p2.addButton("Diagramm erstellen");
        if (p2.show()) {
            var appNames = p2.fieldValues["appNames"].split(",").map(x => x.trim());
            var preise = p2.fieldValues["preise"].split(",").map(x => parseFloat(x.trim().replace(",", ".")));
            var intervalle = p2.fieldValues["intervalle"].split(",").map(x => x.trim().toUpperCase());
            // Validierung
            if (appNames.length !== preise.length || appNames.length !== intervalle.length) {
                alert("⚠️ Die Anzahl der Namen, Preise und Intervalle stimmt nicht überein!");
                Script.complete();
            }
            var apps = [];
            for (var i = 0; i < appNames.length; i++) {
                var name = appNames[i],
                    preis = preise[i],
                    intervall = intervalle[i];
                if (name && !isNaN(preis) && (intervall == "M" || intervall == "J")) {
                    var monatlich = intervall == "M" ? preis : preis / 12;
                    apps.push({
                        name: name,
                        originalPreis: preis,
                        intervall: (intervall == "M" ? "Monatlich" : "Jährlich"),
                        monatlicheKosten: monatlich
                    });
                }
            }
            if (apps.length === 0) {
                alert("⚠️ Keine gültigen Einträge erkannt.");
                Script.complete();
            }
            // Sortierung und Diagrammaufbau
            apps.sort((a, b) => b.monatlicheKosten - a.monatlicheKosten);
            var maxKosten = Math.max(...apps.map(app => app.monatlicheKosten));
            var skalierung = 50;
            var diagramm = "📱 APP-KOSTEN VERGLEICH (MONATLICH)\n" + "═".repeat(80) + "\n\n";
            apps.forEach(function(app) {
                var balkenLaenge = Math.round((app.monatlicheKosten / maxKosten) * skalierung);
                var balken = "█".repeat(balkenLaenge);
                var appName = app.name.substring(0, 15).padEnd(15);
                var kosten = `${app.monatlicheKosten.toFixed(2)}€`.padStart(8);
                var info = `(${app.originalPreis}€/${app.intervall.toLowerCase().substring(0,3)})`.padStart(12);
                diagramm += `${appName} |${balken} ${kosten} ${info}\n`;
            });
            var gesamtMonatlich = apps.reduce((sum, app) => sum + app.monatlicheKosten, 0);
            var gesamtJaehrlich = gesamtMonatlich * 12;
            diagramm += "\n" + "═".repeat(80) + "\n";
            diagramm += `💰 Gesamtkosten: ${gesamtMonatlich.toFixed(2)}€/Monat | ${gesamtJaehrlich.toFixed(2)}€/Jahr\n`;
            diagramm += `📊 Anzahl Apps: ${apps.length} | Teuerste App: ${apps[0].name} (${maxKosten.toFixed(2)}€/Monat)`;
            editor.setText(diagramm);
        }
    }
    // -------------- 2. Säulendiagramm (Monatsverlauf) ------------------
    else if (typ == "Säulendiagramm (Monatsverlauf)") {
        var p2 = Prompt.create();
        p2.title = "📊 Monatliche App-Ausgaben (vergleich App/Abos)";
        p2.message = "Vergleichen Sie die monatlichen Ausgaben pro App/Abo oder als Summe über Monate:";
        p2.addTextField("appNames", "App-Namen (Komma-getrennt):", "Netflix,Spotify,Adobe CC");
        p2.addTextField("werte", "Jede App/Abo: 12 Werte, je Monat (€; Kommagetrennt; z.B. Jan-Dez)", 
                        "12.99,12.99,12.99,12.99,12.99,12.99,12.99,12.99,12.99,12.99,12.99,12.99|" +
                        "9.99,9.99,9.99,9.99,9.99,9.99,9.99,9.99,9.99,9.99,9.99,9.99|" +
                        "59.99,0,0,0,59.99,0,0,0,59.99,0,0,0");
        p2.addTextField("monate", "Monate (falls abweichend):", "Jan,Feb,Mär,Apr,Mai,Jun,Jul,Aug,Sep,Okt,Nov,Dez");
        p2.addButton("Diagramm erstellen");
        if (p2.show()) {
            var appNames = p2.fieldValues["appNames"].split(",").map(x => x.trim());
            var werteInput = p2.fieldValues["werte"];
            var monate = p2.fieldValues["monate"].split(",").map(m => m.trim());
            // Werte format: Für jede App eine eigene Liste durch | getrennt
            var werteProApp = werteInput.split("|").map(line =>
                line.split(",").map(x => parseFloat(x.trim().replace(",", ".")))
            );
            if (appNames.length !== werteProApp.length) {
                alert("⚠️ Die Anzahl der App-Namen und Wertreihen stimmt nicht überein.");
                Script.complete();
            }
            var maxLen = werteProApp.reduce((acc, arr) => Math.max(acc, arr.length), 0);
            var diagramm = `📊 MONATLICHE APP-/ABO-AUSGABEN\n` + "═".repeat(80) + "\n\n";
            // Betrag pro Monat und App aufsummiert
            var totalWerteProMonat = [];
            for (var i = 0; i < maxLen; i++) {
                var total = 0;
                for (var appIdx = 0; appIdx < appNames.length; appIdx++) {
                    if (!isNaN(werteProApp[appIdx][i] || 0)) {
                        total += werteProApp[appIdx][i] || 0;
                    }
                }
                totalWerteProMonat.push(total);
            }
            // Balken pro App anzeigen (gestapelt)
            var maxWert = Math.max(...totalWerteProMonat);
            var maxHoehe = 12;
            for (var zeile = maxHoehe; zeile > 0; zeile--) {
                let reihe = "";
                for (var monatIdx = 0; monatIdx < totalWerteProMonat.length; monatIdx++) {
                    // Farben als App-Index-Kennung
                    var appBlock = "";
                    var stackSum = 0;
                    for (var a = 0; a < appNames.length; a++) {
                        let appWert = werteProApp[a][monatIdx] || 0;
                        stackSum += appWert;
                        var saeuleHoehe = Math.round((stackSum / maxWert) * maxHoehe);
                        if (saeuleHoehe >= zeile) {
                            appBlock = ("█".charCodeAt(0) + a) % 2 == 0 ? "██" : "▓▓";
                        }
                    }
                    reihe += appBlock ? appBlock + " " : "   ";
                }
                diagramm += reihe + "\n";
            }
            diagramm += "─".repeat(totalWerteProMonat.length * 3) + "\n";
            var labelReihe = "";
            for (var i = 0; i < totalWerteProMonat.length; i++)
                labelReihe += (monate[i % monate.length] || "-").substring(0, 2).padEnd(3);
            diagramm += labelReihe + "\n";
            diagramm += totalWerteProMonat.map(w => w.toFixed(0).padEnd(3)).join('') + "\n\n";
            let gesamtJahr = totalWerteProMonat.reduce((s, a) => s + a, 0);
            let durchschnitt = gesamtJahr / totalWerteProMonat.length;
            diagramm += "═".repeat(80) + "\n";
            diagramm += `📊 Max: ${maxWert.toFixed(2)}€ | ⌀ ${durchschnitt.toFixed(2)}€/Monat | Gesamtjahr: ${gesamtJahr.toFixed(2)}€\n`;
            diagramm += "Legende:\n";
            for (var k = 0; k < appNames.length; k++) {
                diagramm += `  ${(k%2==0?"██":"▓▓")} ${appNames[k]}\n`;
            }
            editor.setText(diagramm);
        }
    }
    // ---------------- Liniendiagramm (Kostenverlauf) --------------------
    else if (typ == "Liniendiagramm (Kostenverlauf)") {
        var p2 = Prompt.create();
        p2.title = "📈 Kostenverlauf Apps/Abos";
        p2.message = "Visualisieren Sie die Entwicklung mehrerer Apps (jede Kurve einzeln angeben, Kommagetrennt und durch | trennen):";
        p2.addTextField("appNames", "App-Namen:", "Netflix,Spotify");
        p2.addTextField("werte", "Monatliche Kosten pro App/Abo (Kommagetrennt, durch | trennen)", 
            "12.99,13.99,14.99,13.99,14.99,14.99,15.49,14.99,13.99,13.99,14.49,14.99|9.99,9.99,10.99,10.99,9.99,9.99,9.99,10.99,11.99,9.99,10.49,10.99");
        p2.addTextField("zeitraum", "Monate:", "Jan,Feb,Mär,Apr,Mai,Jun,Jul,Aug,Sep,Okt,Nov,Dez");
        p2.addButton("Diagramm erstellen");
        if (p2.show()) {
            var appNames = p2.fieldValues["appNames"].split(",").map(x => x.trim());
            var werteStr = p2.fieldValues["werte"];
            var zeitraum = p2.fieldValues["zeitraum"].split(",").map(z => z.trim());
            var werteProApp = werteStr.split("|").map(line =>
                line.split(",").map(x => parseFloat(x.trim().replace(",", ".")))
            );
            if (appNames.length !== werteProApp.length) {
                alert("⚠️ Anzahl App-Namen und Wertreihen stimmt nicht überein!");
                Script.complete();
            }
            var maxLen = werteProApp.reduce((acc, arr) => Math.max(acc, arr.length), 0);
            var werteAlle = [];
            for (var monat = 0; monat < maxLen; monat++) {
                var summe = 0;
                for (var a = 0; a < appNames.length; a++) 
                    summe += werteProApp[a][monat] || 0;
                werteAlle.push(summe);
            }
            var minWert = Math.min(...werteAlle);
            var maxWert = Math.max(...werteAlle);
            var hoehe = 15;
            var diagramm = `📈 APP/ABO-KOSTENVERLAUF\n` + "═".repeat(80) + "\n\n";
            for (var y = hoehe; y >= 0; y--) {
                let reihe = "";
                let yWert = minWert + (maxWert - minWert) * (y / hoehe);
                reihe += y == hoehe || y == 0 || y == Math.round(hoehe/2) ? Math.round(yWert).toString().padStart(3) + "€|" : "    |";
                for (var monat = 0; monat < maxLen; monat++) {
                    var symbol = "   ";
                    for (var a = 0; a < appNames.length; a++) {
                        let w = werteProApp[a][monat];
                        if (w === undefined) continue;
                        let normiert = (w - minWert) / (maxWert - minWert) * hoehe;
                        if (Math.abs(normiert - y) < 0.5) 
                            symbol = (a % 2 === 0) ? "● " : "▲ ";
                    }
                    reihe += symbol;
                }
                diagramm += reihe + "\n";
            }
            diagramm += "    +" + "─".repeat(maxLen * 3) + "\n     ";
            for (var i = 0; i < maxLen; i++)
                diagramm += zeitraum[i % zeitraum.length].substring(0, 2).padStart(3);
            diagramm += "\n";
            diagramm += "═".repeat(80) + "\n";
            diagramm += "Legende: ";
            for (var a = 0; a < appNames.length; a++)
                diagramm += (a%2==0?"●":"▲")+" "+appNames[a]+"   ";
            diagramm += "\n";
            let start = werteAlle[0], ende = werteAlle[werteAlle.length-1];
            let veraenderung = ende - start;
            let prozent = start ? 100*veraenderung/start : 0;
            let durchschnitt = werteAlle.reduce((s,a)=>s+a,0)/werteAlle.length;
            diagramm += `Start: ${start.toFixed(2)}€ | Ende: ${ende.toFixed(2)}€ | ⌀: ${durchschnitt.toFixed(2)}€ | Δ: ${veraenderung.toFixed(2)}€ (${prozent.toFixed(1)}%)\n`;
            editor.setText(diagramm);
        }
    }
    // ---------------- Kreisdiagramm (Kategorien) --------------------
    else if (typ == "Kreisdiagramm (Kategorien)") {
        var p2 = Prompt.create();
        p2.title = "🥧 App-Kategorien Verteilung";
        p2.message = "App-Kategorien und zugehörige Gesamtkosten (Monat), kommagetrennt:";
        p2.addTextField("kategorien", "Kategorien:", "Streaming,Produktivität,Gaming,Musik,Cloud,Sonstiges");
        p2.addTextField("kosten", "Kosten (€):", "25.99,19.99,12.99,9.99,5.99,8.99");
        p2.addButton("Diagramm erstellen");
        if (p2.show()) {
            var kategorien = p2.fieldValues["kategorien"].split(",").map(k => k.trim());
            var kosten = p2.fieldValues["kosten"].split(",").map(k => parseFloat(k.trim().replace(",", ".")));
            if (kategorien.length !== kosten.length) {
                alert("⚠️ Anzahl Kategorien und Kosten stimmt nicht überein!");
                Script.complete();
            }
            var gesamt = kosten.reduce((sum, k) => sum + k, 0);
            var prozente = kosten.map(k => (k / gesamt * 100));
            var diagramm = `🥧 APP-AUSGABEN NACH KATEGORIEN\n` + "═".repeat(80) + "\n\n";
            diagramm += "           ●●●●●●●●●●●●●\n";
            diagramm += "         ●●             ●●\n";
            diagramm += "       ●●                 ●●\n";
            diagramm += "      ●●                   ●●\n";
            diagramm += "     ●●                     ●●\n";
            diagramm += "    ●●          💰          ●●\n";
            diagramm += "    ●●      APP-KOSTEN      ●●\n";
            diagramm += "    ●●                      ●●\n";
            diagramm += "     ●●                     ●●\n";
            diagramm += "      ●●                   ●●\n";
            diagramm += "       ●●                 ●●\n";
            diagramm += "         ●●             ●●\n";
            diagramm += "           ●●●●●●●●●●●●●\n\n";
            var icons = ["📺", "💼", "🎮", "🎵", "☁️", "📚", "🛒", "🏃", "📱", "🎨"];
            var sortiert = kategorien.map((kat, i) => ({
                name: kat, kosten: kosten[i] || 0, prozent: prozente[i] || 0
            })).sort((a, b) => b.kosten - a.kosten);
            diagramm += "📊 KATEGORIEN-AUFSCHLÜSSELUNG:\n\n";
            sortiert.forEach(function(item, idx) {
                var icon = icons[idx % icons.length];
                var balkenLaenge = Math.round(item.prozent / 100 * 30);
                var balken = "█".repeat(balkenLaenge);
                diagramm += `${icon} ${item.name.padEnd(15)} ${item.kosten.toFixed(2).padStart(8)}€ ${item.prozent.toFixed(1).padStart(6)}% |${balken}\n`;
            });
            diagramm += "\n" + "═".repeat(80) + "\n";
            diagramm += `💰 Gesamtkosten: ${gesamt.toFixed(2)}€/Monat | ${(gesamt * 12).toFixed(2)}€/Jahr\n`;
            diagramm += `📈 Top: ${sortiert[0].name} (${sortiert[0].prozent.toFixed(1)}%) / Anzahl: ${sortiert.filter(k => k.kosten > 0).length}`;
            editor.setText(diagramm);
        }
    }
}
