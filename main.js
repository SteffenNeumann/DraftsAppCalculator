// App-Kosten Diagramm-Generator (automatische Datensammlung aus Drafts)

// Funktion zum Durchsuchen und Sammeln von App-Daten
function sammleAppDaten() {
	// Definiere das Tag wie im Beispielscript
	const appTag = "app";

	// Verwende die korrekte Drafts API-Syntax: query(content, folder, tags)
	let appDrafts = Draft.query("", "all", [appTag]);

	let appDaten = [];

	for (let draft of appDrafts) {
		let content = draft.content;
		let lines = content.split("\n");

		let appInfo = {
			name: "",
			preis: 0,
			intervall: "M",
			kategorie: "Sonstiges",
			monatlicheWerte: [], // Für Verlaufsdiagramme
		};

		// Extrahiere App-Informationen aus dem Draft-Inhalt
		for (let line of lines) {
			line = line.trim();

			// App-Name aus Titel-Zeile (beginnt mit #)
			if (line.startsWith("#") && !appInfo.name) {
				appInfo.name = line.replace("#", "").trim();
			}

			// Preis-Extraktion für dein Template-Format: "Preis/Monat:" oder "Preis/Jahr:"
			let preisMatch = line.match(
				/Preis\s*\/\s*(Monat|Jahr)\s*:\s*([0-9,\.]+)/i
			);
			if (preisMatch) {
				appInfo.preis = parseFloat(preisMatch[2].replace(",", "."));
				// Erkenne Intervall aus der Zeile
				if (preisMatch[1].toLowerCase().includes("jahr")) {
					appInfo.intervall = "J";
				} else {
					appInfo.intervall = "M";
				}
			}

			// Kategorie-Extraktion für dein Template-Format: "Kategorie :"
			let kategorieMatch = line.match(/^Kategorie\s*:\s*(.+)/i);
			if (kategorieMatch) {
				appInfo.kategorie = kategorieMatch[1].trim();
			}

			// Monatliche Werte für Verlaufsdiagramme
			let verlaufMatch = line.match(
				/(?:verlauf|monthly|monatlich|monatliche\s+kosten).*?[:=\s]+(.+)/i
			);
			if (verlaufMatch) {
				appInfo.monatlicheWerte = verlaufMatch[1]
					.split(",")
					.map((w) => parseFloat(w.trim().replace(",", ".")));
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
	alert(
		"⚠️ Keine App-Daten gefunden! Erstellen Sie Drafts mit dem Tag 'app' und verwenden Sie das Template:\n\n# App Name\nPreis/Monat: 19.99\nKategorie: Streaming\nAbo seit: [[date]]\n\n> Notes"
	);
	Script.complete();
}

// ------------------ 1. Balkendiagramm (Apps/Preis) --------------------
// Verwende gesammelte App-Daten
var apps = [];
for (var i = 0; i < appDaten.length; i++) {
	var app = appDaten[i];
	var monatlich = app.intervall == "M" ? app.preis : app.preis / 12;
	apps.push({
		name: app.name,
		originalPreis: app.preis,
		intervall: app.intervall == "M" ? "Monatlich" : "Jährlich",
		monatlicheKosten: monatlich,
	});
}

// Sortierung und Diagrammaufbau
apps.sort((a, b) => b.monatlicheKosten - a.monatlicheKosten);
var maxKosten = Math.max(...apps.map((app) => app.monatlicheKosten));
var skalierung = 25; // Halbiert von 50 auf 25
var diagramm =
	"📱 APP-KOSTEN VERGLEICH (MONATLICH)\n" + "═".repeat(60) + "\n\n";
apps.forEach(function (app) {
	var balkenLaenge = Math.round(
		(app.monatlicheKosten / maxKosten) * skalierung
	);
	// Verwende farbige Balken (rot für Things Light Theme - Bold Text Farbe)
	var balken = "\x1b[31m" + "█".repeat(balkenLaenge) + "\x1b[0m";
	var appName = app.name.substring(0, 15).padEnd(15);
	var kosten = `${app.monatlicheKosten.toFixed(2)}€`.padStart(8);
	diagramm += `${appName} |${balken} ${kosten}\n`;
});
var gesamtMonatlich = apps.reduce((sum, app) => sum + app.monatlicheKosten, 0);
var gesamtJaehrlich = gesamtMonatlich * 12;
diagramm += "\n" + "═".repeat(60) + "\n";
diagramm += `💰 Gesamtkosten: ${gesamtMonatlich.toFixed(
	2
)}€/Monat | ${gesamtJaehrlich.toFixed(2)}€/Jahr\n`;
diagramm += `📊 Anzahl Apps: ${apps.length} | Teuerste App: ${
	apps[0].name
} (${maxKosten.toFixed(2)}€/Monat)\n\n`;

// ------------------ 2. Kreisdiagramm (Kategorien/Preis) --------------------
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

if (kategorien.length > 0) {
	var gesamt = kosten.reduce((sum, k) => sum + k, 0);
	var prozente = kosten.map((k) => (k / gesamt) * 100);

	diagramm += "🥧 KATEGORIEN-ÜBERSICHT\n" + "═".repeat(60) + "\n\n";

	var icons = ["📺", "💼", "🎮", "🎵", "☁️", "📚", "🛒", "🏃", "📱", "🎨"];
	var sortiert = kategorien
		.map((kat, i) => ({
			name: kat,
			kosten: kosten[i] || 0,
			prozent: prozente[i] || 0,
		}))
		.sort((a, b) => b.kosten - a.kosten);

	sortiert.forEach(function (item, idx) {
		var icon = icons[idx % icons.length];
		var balkenLaenge = Math.round((item.prozent / 100) * 15); // Halbiert von 30 auf 15
		// Verwende farbige Balken (rot für Things Light Theme - Bold Text Farbe)
		var balken = "\x1b[31m" + "█".repeat(balkenLaenge) + "\x1b[0m";
		diagramm += `${icon} ${item.name.padEnd(15)} ${item.kosten
			.toFixed(2)
			.padStart(8)}€ ${item.prozent.toFixed(1).padStart(6)}% |${balken}\n`;
	});

	diagramm += "\n" + "═".repeat(60) + "\n";
	diagramm += `💰 Gesamtkosten: ${gesamt.toFixed(2)}€/Monat | ${(
		gesamt * 12
	).toFixed(2)}€/Jahr\n`;
	diagramm += `📈 Top: ${sortiert[0].name} (${sortiert[0].prozent.toFixed(
		1
	)}%) / Anzahl: ${sortiert.filter((k) => k.kosten > 0).length}`;
}

editor.setText(diagramm);
