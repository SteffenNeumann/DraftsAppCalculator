// App-Kosten Diagramm-Generator (automatische Datensammlung aus Drafts)

// Funktion zum Durchsuchen und Sammeln von App-Daten
function sammleAppDaten() {
    // Durchsuche alle Drafts mit dem Tag "app"
    let appDrafts = Draft.query("", "all", [], ["app"], "modified", true, false);
    
    let appDaten = [];
    
    for (let draft of appDrafts) {
        let content = draft.content;
        let lines = content.split("\n");
        
        let appInfo = {
            name: "",
            preis: 0,
            intervall: "M",
            kategorie: "Sonstiges",
            monatlicheWerte: [] // Für Verlaufsdiagramme
        };
        
        // Extrahiere App-Informationen aus dem Draft-Inhalt
        for (let line of lines) {
            line = line.trim();
            
            // App-Name aus Titel-Zeile (beginnt mit #)
            if (line.startsWith("#") && !appInfo.name) {
                appInfo.name = line.replace("#", "").trim();
            }
            
            // Preis-Extraktion (deutsche Formate)
            let preisMatch = line.match(/(?:preis|kosten|price|cost).*?[:=\s]+([0-9,\.]+)[\s€]*(?:\/(m|j|monat|jahr|monthly|yearly))?/i);
            if (preisMatch) {
                appInfo.preis = parseFloat(preisMatch[1].replace(",", "."));
                // Standardmäßig monatlich, außer explizit anders angegeben
                if (preisMatch[2] && (preisMatch[2].toLowerCase().startsWith('j') || preisMatch[2].toLowerCase().includes('jahr') || preisMatch[2].toLowerCase().includes('year'))) {
                    appInfo.intervall = "J";
                }
            }
            
            // Kategorie-Extraktion (deutsche Formate)
            let kategorieMatch = line.match(/(?:kategorie|category|type|art).*?[:=\s]+(.+)/i);
            if (kategorieMatch) {
                appInfo.kategorie = kategorieMatch[1].trim();
            }
            
            // Monatliche Werte für Verlaufsdiagramme
            let verlaufMatch = line.match(/(?:verlauf|monthly|monatlich|monatliche\s+kosten).*?[:=\s]+(.+)/i);
            if (verlaufMatch) {
                appInfo.monatlicheWerte = verlaufMatch[1].split(",").map(w => parseFloat(w.trim().replace(",", ".")));
            }
        }
        
        // Verwende Draft-Titel als App-Name falls nicht gefunden
        if (!appInfo.name) {
            appInfo.name = draft.title.replace(/#/g, "").trim();
        }
        
        // Füge nur Apps mit gültigen Daten hinzu
        if (appInfo.name && appInfo.preis > 0) {
            appDaten.push(appInfo);
        }
    }
    
    return appDaten;
}

// Sammle App-Daten
var appDaten = sammleAppDaten();

if (appDaten.length === 0) {
    alert("⚠️ Keine App-Daten gefunden! Erstellen Sie Drafts mit dem Tag 'app' und fügen Sie App-Informationen hinzu.\n\nBeispiel:\n# Netflix\nPreis im Monat: 19.99\nKategorie: Streaming\nAbo seit: 01.02.2000");
    Script.complete();
}

var p = Prompt.create();
p.title = "💰 App-Kosten Diagramm-Generator";
p.message = `${appDaten.length} Apps aus Drafts gefunden. Wählen Sie den Diagramm-Typ:`;
p.addSelect("diagrammTyp", "Diagramm-Typ:", [
    "Balkendiagramm (Apps)", 
    "Säulendiagramm (Monatsverlauf)", 
    "Liniendiagramm (Kostenverlauf)",
    "Kreisdiagramm (Kategorien)"
], ["Balkendiagramm (Apps)"], false);
p.addButton("Diagramm erstellen");
if (p.show()) {
    var typ = p.fieldValues["diagrammTyp"];
    // ------------------ 1. Balkendiagramm (Apps) --------------------
    if (typ == "Balkendiagramm (Apps)") {
        // Verwende gesammelte App-Daten
        var apps = [];
        for (var i = 0; i < appDaten.length; i++) {
            var app = appDaten[i];
            var monatlich = app.intervall == "M" ? app.preis : app.preis / 12;
            apps.push({
                name: app.name,
                originalPreis: app.preis,
                intervall: (app.intervall == "M" ? "Monatlich" : "Jährlich"),
                monatlicheKosten: monatlich
            });
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
    // -------------- 2. Säulendiagramm (Monatsverlauf) ------------------
    else if (typ == "Säulendiagramm (Monatsverlauf)") {
        // Verwende gesammelte App-Daten oder erstelle 12-Monats-Daten
        var appNames = appDaten.map(app => app.name);
        var werteProApp = [];
        var monate = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
        
        for (var i = 0; i < appDaten.length; i++) {
            var app = appDaten[i];
            var monatlich = app.intervall == "M" ? app.preis : app.preis / 12;
            
            // Verwende monatlicheWerte falls vorhanden, sonst wiederhole den monatlichen Preis
            if (app.monatlicheWerte && app.monatlicheWerte.length > 0) {
                werteProApp.push(app.monatlicheWerte.slice(0, 12));
            } else {
                var werte = [];
                for (var j = 0; j < 12; j++) {
                    werte.push(monatlich);
                }
                werteProApp.push(werte);
            }
        }
        
        var maxLen = 12;
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
    // ---------------- Liniendiagramm (Kostenverlauf) --------------------
    else if (typ == "Liniendiagramm (Kostenverlauf)") {
        // Verwende gesammelte App-Daten
        var appNames = appDaten.map(app => app.name);
        var werteProApp = [];
        var zeitraum = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
        
        for (var i = 0; i < appDaten.length; i++) {
            var app = appDaten[i];
            var monatlich = app.intervall == "M" ? app.preis : app.preis / 12;
            
            // Verwende monatlicheWerte falls vorhanden, sonst wiederhole den monatlichen Preis
            if (app.monatlicheWerte && app.monatlicheWerte.length > 0) {
                werteProApp.push(app.monatlicheWerte.slice(0, 12));
            } else {
                var werte = [];
                for (var j = 0; j < 12; j++) {
                    werte.push(monatlich);
                }
                werteProApp.push(werte);
            }
        }
        
        var maxLen = 12;
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
    // ---------------- Kreisdiagramm (Kategorien) --------------------
    else if (typ == "Kreisdiagramm (Kategorien)") {
        // Gruppiere Apps nach Kategorien
        var kategorienMap = {};
        
        for (var i = 0; i < appDaten.length; i++) {
            var app = appDaten[i];
            var monatlich = app.intervall == "M" ? app.preis : app.preis / 12;
            var kategorie = app.kategorie || "Sonstiges";
            
            if (!kategorienMap[kategorie]) {
                kategorienMap[kategorie] = 0;
            }
            kategorienMap[kategorie] += monatlich;
        }
        
        var kategorien = Object.keys(kategorienMap);
        var kosten = Object.values(kategorienMap);
        
        if (kategorien.length === 0) {
            alert("⚠️ Keine Kategorien-Daten gefunden!");
            Script.complete();
        }
        
        var gesamt = kosten.reduce((sum, k) => sum + k, 0);
        var prozente = kosten.map(k => (k / gesamt * 100));
        var diagramm = `🥧 APP-AUSGABEN NACH KATEGORIEN\n` + "═".repeat(80) + "\n\n";
        
        // Modernes Kreisdiagramm-Design
        diagramm += "                    📊 KATEGORIEN-ÜBERSICHT 📊\n";
        diagramm += "                   ┌─────────────────────────┐\n";
        diagramm += "                   │     💰 GESAMTKOSTEN     │\n";
        diagramm += "                   │    " + gesamt.toFixed(2).padStart(6) + "€/Monat        │\n";
        diagramm += "                   │    " + (gesamt * 12).toFixed(2).padStart(6) + "€/Jahr         │\n";
        diagramm += "                   └─────────────────────────┘\n\n";
        
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
