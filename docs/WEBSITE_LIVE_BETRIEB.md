# NBHandel – Webflow gestalten, kostenlos über GitHub Pages veröffentlichen

## Verbindlicher Arbeitsweg ab 25.10.2026

- Wir haben das Webflow-Design gekauft. **Webflow ist unsere visuelle Bearbeitungs- und Vorschauumgebung.**
- Das bestehende Webflow-Projekt ist nbhandel-16b9f2 (Site-ID 6abedad969a74cbc62fc1fbe); kostenlose Vorschau: https://nbhandel-16b9f2.webflow.io/
- **GitHub Pages bleibt das kostenlose Hosting für https://nbhandel.de.** Keine neue Site-Hosting-Buchung und kein Domain- oder DNS-Wechsel.
- Der einzige reguläre Veröffentlichungsworkflow ist .github/workflows/pages.yml, ausschließlich manuell startbar; keine Push-/Zeit-Trigger.
- Die 58 HTML-Seiten und 57 lokalisierten Webflow-Ressourcen im unveränderten GitHub-Verzeichnis site/ sind die Rückfallkopie vom 24.10.2026. **site/ ist keine zweite aktive Designquelle.**
- tools/build_webflow_release.py erstellt eine getrennte Website-Kopie _site/ aus den in Webflow veröffentlichten Seiten. Die vorhandene Asset-Mirroring-/SRI-Routine aus tools/import_live_snapshot.py wird wiederverwendet.
- Vor jedem Release muss tools/verify_site.py _site bestehen. Ein Build ist keine Veröffentlichung.

## Kontrolle und Veröffentlichung

1. Die vorhandene v60-Gestaltung in **Webflow** bearbeiten. Nicht nebenher in GitHub ein neues Design entwerfen.
2. Im Webflow Designer die Vorschau für Desktop und Mobil kontrollieren und die gewünschte Fassung unter der kostenlosen Webflow-Testadresse veröffentlichen. Das ändert nbhandel.de nicht.
3. GitHub Actions → **NBHandel | Webflow-Vorschau → GitHub Pages** → Run workflow → **preview**: Website-Snapshot erzeugen, prüfen und als Artefakt ablegen. Keine Live-Änderung.
4. Nach tatsächlicher visueller und fachlicher Freigabe denselben Workflow mit **publish** starten. Nur dieser Schritt aktualisiert nbhandel.de.
5. Anschließend echten Live-Readback durchführen: Startseite, Produktsuche, Scanner/Tools, mobile Darstellung, CSS/Bilder, Datenschutz und Impressum. Erst nach diesem Beleg als veröffentlicht melden.

## Fehler und Rückfall

- Wenn Webflow-Abruf, Seitenzahl, wichtige bestehende Funktionen oder Asset-Integrität nicht stimmen: **kein Release**.
- Der ausdrücklich manuell wählbare Modus **restore-github-backup** stellt die GitHub-Sicherung vom 24.10.2026 bereit. Er ist kein normaler Release.
- Jeder Workflow-Lauf legt den gebauten Snapshot für 30 Tage als GitHub-Actions-Artefakt ab. Die bewahrte GitHub-Version und das Webflow-Projekt bleiben unabhängig erhalten.
- Alte sync-live-v2.yml, sync-live-v3.yml und production-sync.yml bleiben archiviert und werden nicht parallel aktiviert.

## Geschäftsrahmen

- Website und eBay sind gleichberechtigte Einstiegskanäle für einen zukünftig breiteren Onlinehandel.
- Keine erfundenen Livepreise oder Händlerangebote, kein ungeprüfter Affiliate-Link und kein externes Tracking ohne entsprechende Freigaben.
- Gekauftes Design, bestehende Produktsuche, Vergleichswerkzeuge, Scanner und Rechtstexte bleiben erhalten. Änderungen sind visuell und fachlich nachzuprüfen.
- Der neue Google-Betriebs-Master steuert die aktuellen Aufgaben. Alte Master und alte Technikphasen gelten nicht als neue Arbeitsaufträge.
