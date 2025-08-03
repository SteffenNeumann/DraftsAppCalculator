// App-Kosten Diagramm-Generator (automatische Datensammlung aus Drafts)

// Funktion zum Durchsuchen und Sammeln von App-Daten
function sammleAppDaten() {
	// Definiere das Tag wie im Beispielscript
	const appTag = "abo";

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
			zusatzPreise: [], // Sammle alle gefundenen Preise
		};

		// Extrahiere App-Informationen aus dem Draft-Inhalt
		let inCodeBlock = false;

		for (let line of lines) {
			line = line.trim();

			// Prüfe auf Markdown-Codeblock Start/Ende
			if (line.startsWith("```")) {
				inCodeBlock = !inCodeBlock;
				continue;
			}

			// App-Name aus Titel-Zeile (beginnt mit #) - nur außerhalb von Codeblöcken
			if (!inCodeBlock && line.startsWith("#") && !appInfo.name) {
				appInfo.name = line.replace("#", "").trim();
			}

			// Preis-Extraktion für dein Template-Format: "Preis/Monat:" oder "Preis/Jahr:"
			// Sammle ALLE Preise (auch aus Notizen und Codeblöcken)
			let preisMatch = line.match(
				/Preis\s*\/\s*(Monat|Jahr)\s*:\s*([0-9,\.]+)/i
			);
			if (preisMatch) {
				let gefundenerPreis = parseFloat(preisMatch[2].replace(",", "."));
				let gefundenerIntervall = preisMatch[1].toLowerCase().includes("jahr")
					? "J"
					: "M";

				// Hauptpreis setzen (erster gefundener Preis außerhalb von Codeblöcken)
				if (!inCodeBlock && appInfo.preis === 0) {
					appInfo.preis = gefundenerPreis;
					appInfo.intervall = gefundenerIntervall;
				} else {
					// Zusätzliche Preise sammeln
					appInfo.zusatzPreise.push({
						preis: gefundenerPreis,
						intervall: gefundenerIntervall,
					});
				}
			}

			// Kategorie-Extraktion für dein Template-Format: "Kategorie :" - nur außerhalb von Codeblöcken
			if (!inCodeBlock) {
				let kategorieMatch = line.match(/^Kategorie\s*:\s*(.+)/i);
				if (kategorieMatch) {
					appInfo.kategorie = kategorieMatch[1].trim();
				}
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

		// Summiere alle Preise (Hauptpreis + Zusatzpreise)
		if (appInfo.zusatzPreise.length > 0) {
			let gesamtpreis = appInfo.preis;

			// Konvertiere Hauptpreis zu jährlich für einheitliche Berechnung
			let hauptpreisJaehrlich =
				appInfo.intervall === "J" ? appInfo.preis : appInfo.preis * 12;

			// Addiere alle Zusatzpreise (konvertiert zu jährlich)
			for (let zusatz of appInfo.zusatzPreise) {
				let zusatzJaehrlich =
					zusatz.intervall === "J" ? zusatz.preis : zusatz.preis * 12;
				hauptpreisJaehrlich += zusatzJaehrlich;
			}

			// Setze Gesamtpreis zurück (basierend auf ursprünglichem Intervall)
			appInfo.preis =
				appInfo.intervall === "J"
					? hauptpreisJaehrlich
					: hauptpreisJaehrlich / 12;
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
		"⚠️ Keine App-Daten gefunden! Erstellen Sie Drafts mit dem Tag 'abo' und verwenden Sie das Template:\n\n# App Name\nPreis/Monat: 19.99\nPreis/Jahr: 239.88\nKategorie: Streaming\nAbo seit: [[date]]\n\n> Notes"
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
var skalierung = 25;
var gesamtMonatlich = apps.reduce((sum, app) => sum + app.monatlicheKosten, 0);
var gesamtJaehrlich = gesamtMonatlich * 12;

var diagramm = `## ABO-KOSTEN VERGLEICH\n\n`;
diagramm += `**${apps.length} Abos,Gesamtkosten:** ${gesamtMonatlich.toFixed(
	2
)}€/Monat • ${gesamtJaehrlich.toFixed(2)}€/Jahr\n\n`;

apps.forEach(function (app) {
	var balkenLaenge = Math.round(
		(app.monatlicheKosten / maxKosten) * skalierung
	);
	var balken = "▓".repeat(balkenLaenge);
	var appName = `[[${app.name}]]`.padEnd(18);
	var kosten = `${app.monatlicheKosten.toFixed(2)}€`;
	diagramm += `${appName}|${balken}   ${kosten}\n`;
});

diagramm += `\n\n`;

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

	diagramm += "##  KATEGORIEN-ÜBERSICHT\n\n";

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
		var balkenLaenge = Math.round((item.prozent / 100) * 6); // Angepasst für kürzere Balken
		// Entferne ANSI-Farbcodes, da sie in Drafts nicht unterstützt werden
		var balken = "▒".repeat(balkenLaenge);
		var kategorieName = item.name.padEnd(18);
		var kategorieKosten = `${item.kosten.toFixed(2)}€`.padStart(8);
		var kategorieProzent = `${item.prozent.toFixed(1)}%`.padStart(6);
		diagramm += `${icon} ${kategorieName} ${kategorieKosten}   ${kategorieProzent} |${balken}\n`;
	});

	diagramm += `\n`;
}

// ------------------ 3. Monatliche Kostenentwicklung --------------------
function erstelleMonatlicheKostenvisualisierung() {
	var kostenVisualisierung = "## 📈 MONATLICHE KOSTENENTWICKLUNG\n\n";

	// Gruppiere Abos nach Abrechnungsintervall
	var monatlicheAbos = [];
	var jaehrlicheAbos = [];

	for (var i = 0; i < appDaten.length; i++) {
		var app = appDaten[i];
		var monatlicheKosten = app.intervall == "M" ? app.preis : app.preis / 12;

		if (app.intervall == "M") {
			monatlicheAbos.push({
				name: app.name,
				kosten: app.preis,
				kategorie: app.kategorie,
			});
		} else {
			jaehrlicheAbos.push({
				name: app.name,
				kosten: app.preis,
				monatlicheKosten: monatlicheKosten,
				kategorie: app.kategorie,
			});
		}
	}

	// Berechne Gesamtkosten
	var gesamtMonatlicheAbos = monatlicheAbos.reduce(
		(sum, app) => sum + app.kosten,
		0
	);
	var gesamtJaehrlicheAbos = jaehrlicheAbos.reduce(
		(sum, app) => sum + app.kosten,
		0
	);
	var gesamtJaehrlichMonatlich = jaehrlicheAbos.reduce(
		(sum, app) => sum + app.monatlicheKosten,
		0
	);
	var gesamtAlleMonatlich = gesamtMonatlicheAbos + gesamtJaehrlichMonatlich;

	// Übersicht der Abrechnungsarten
	kostenVisualisierung += `**Abrechnungsübersicht:**\n`;
	kostenVisualisierung += `🔄 Monatliche Abos: ${
		monatlicheAbos.length
	} Apps • ${gesamtMonatlicheAbos.toFixed(2)}€/Monat\n`;
	kostenVisualisierung += `📅 Jährliche Abos: ${
		jaehrlicheAbos.length
	} Apps • ${gesamtJaehrlicheAbos.toFixed(
		2
	)}€/Jahr (${gesamtJaehrlichMonatlich.toFixed(2)}€/Monat)\n`;
	kostenVisualisierung += `💰 **Gesamt: ${gesamtAlleMonatlich.toFixed(
		2
	)}€/Monat • ${(gesamtAlleMonatlich * 12).toFixed(2)}€/Jahr**\n\n`;

	// Erstelle 12-Monats-Verlauf
	kostenVisualisierung += `**12-Monats-Kostenverlauf:**\n`;
	var maxMonatlicheKosten = gesamtAlleMonatlich;
	var skalierungZeit = 20;

	// Simuliere monatliche Schwankungen (jährliche Abos werden in bestimmten Monaten fällig)
	var monate = [
		"Jan",
		"Feb",
		"Mär",
		"Apr",
		"Mai",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Okt",
		"Nov",
		"Dez",
	];

	for (var monat = 0; monat < 12; monat++) {
		var monatlicheKostenTotal = gesamtMonatlicheAbos; // Immer anfallende monatliche Kosten
		var jaehrlicheKostenImMonat = 0;

		// Simuliere: Jährliche Abos werden gleichmäßig über das Jahr verteilt fällig
		// (In der Realität würdest du hier echte Fälligkeitsdaten verwenden)
		for (var j = 0; j < jaehrlicheAbos.length; j++) {
			// Verteile jährliche Zahlungen gleichmäßig über die Monate (vereinfacht)
			if (
				monat % Math.ceil(12 / jaehrlicheAbos.length) ===
				j % Math.ceil(12 / jaehrlicheAbos.length)
			) {
				jaehrlicheKostenImMonat += jaehrlicheAbos[j].kosten;
			}
		}

		var gesamtKostenImMonat = monatlicheKostenTotal + jaehrlicheKostenImMonat;
		var balkenLaenge = Math.round(
			(gesamtKostenImMonat / (maxMonatlicheKosten * 3)) * skalierungZeit
		);
		var balken = "█".repeat(Math.max(1, balkenLaenge));

		var anzeige =
			jaehrlicheKostenImMonat > 0
				? `${gesamtKostenImMonat.toFixed(0)}€ (${monatlicheKostenTotal.toFixed(
						0
				  )}€ + ${jaehrlicheKostenImMonat.toFixed(0)}€ jährl.)`
				: `${gesamtKostenImMonat.toFixed(0)}€`;

		kostenVisualisierung += `${monate[monat]} |${balken}  ${anzeige}\n`;
	}

	kostenVisualisierung += `\n`;

	// Aufschlüsselung nach Abrechnungsart
	if (monatlicheAbos.length > 0) {
		kostenVisualisierung += `**🔄 Monatliche Abos (${monatlicheAbos.length}):**\n`;
		monatlicheAbos.sort((a, b) => b.kosten - a.kosten);

		for (var i = 0; i < monatlicheAbos.length; i++) {
			var app = monatlicheAbos[i];
			var anteil = (app.kosten / gesamtMonatlicheAbos) * 100;
			var balkenLaenge = Math.round((anteil / 100) * 8);
			var balken = "▓".repeat(Math.max(1, balkenLaenge));
			kostenVisualisierung += `  ${app.name.padEnd(15)} ${app.kosten.toFixed(
				2
			)}€ |${balken} ${anteil.toFixed(1)}%\n`;
		}
		kostenVisualisierung += `\n`;
	}

	if (jaehrlicheAbos.length > 0) {
		kostenVisualisierung += `**📅 Jährliche Abos (${jaehrlicheAbos.length}):**\n`;
		jaehrlicheAbos.sort((a, b) => b.kosten - a.kosten);

		for (var i = 0; i < jaehrlicheAbos.length; i++) {
			var app = jaehrlicheAbos[i];
			var anteil = (app.monatlicheKosten / gesamtJaehrlichMonatlich) * 100;
			var balkenLaenge = Math.round((anteil / 100) * 8);
			var balken = "▒".repeat(Math.max(1, balkenLaenge));
			kostenVisualisierung += `  ${app.name.padEnd(15)} ${app.kosten.toFixed(
				2
			)}€/Jahr (${app.monatlicheKosten.toFixed(
				2
			)}€/Monat) |${balken} ${anteil.toFixed(1)}%\n`;
		}
		kostenVisualisierung += `\n`;
	}

	return kostenVisualisierung;
}

// Füge die monatliche Kostenvisualisierung hinzu
diagramm += erstelleMonatlicheKostenvisualisierung();

editor.setText(diagramm);
