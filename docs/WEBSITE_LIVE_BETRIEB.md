# NBHandel – GitHub-geführter Live-Betrieb

## Maßgebliche Quelle und Deployment

- Produktionsquellcode: Verzeichnis site/ in diesem Repository, Branch main.
- Auslieferung: GitHub Pages, Domain nbhandel.de, ausschließlich via .github/workflows/pages.yml.
- Deployment: Der Workflow prüft mit tools/verify_site.py und veröffentlicht nur den GitHub-Checkout von site/. Kein Live-Abruf von Webflow und keine Neuerzeugung von HTML zur Deploy-Zeit.
- Änderungen: Feature-Branch mit Pull Request. Erst nach fachlicher Prüfung und Freigabe auf main zusammenführen.
- Webflow: Historische Design-/Erstellungsquelle. Die aktuelle öffentliche Live-Version wurde anhand der veröffentlichten Sitemap mit 58 Routen einmalig als GitHub-Dateien eingefroren. Webflow nicht voreilig kündigen: bestehende externe Ressourcen können es noch benötigen.

## Nachgewiesene Baseline

- 58 öffentliche HTML-Seiten mit Tools, Design, Impressum, Datenschutz und Transparenz.
- 57 eigene CDN-Ressourcen (CSS, JS, Bilder) lokalisiert nach site/vendor/webflow/.
- 289 Subresource-Integrity-Verweise an die lokalisierten Dateien angepasst und geprüft.
- 127 GitHub-Quelldateien im site/-Verzeichnis, etwa 34 MB.
- Details: docs/github-live-source-manifest.json.
- Das Importskript tools/import_live_snapshot.py war ausschließlich für den einmaligen Import vorgesehen. Es ist kein regulärer Live-Workflow.

## Aktive Workflows

1. .github/workflows/pages.yml: einziger Produktions-Deploy bei Änderungen an relevanten Dateien auf main oder manuellem Start.
2. .github/workflows/site-verify.yml: Offline-Prüfung auf Branch und bei Pull Requests; deployt nichts.

Frühere Webflow-Sync-Workflows und einmalige Migrations-/Systemd-Workflows sind ausschließlich als Nachweise unter docs/archived-deployment-workflows/ abgelegt. Diese niemals parallel reaktivieren.

## Regeln für Geschäftsbetrieb und Datenschutz

- Keine neue Affiliate-Weiterleitung, kein Tracking-Skript, kein nicht notwendiges Cookie, kein Produktfeed ohne bestätigten Programm- und Nutzungsrechten.
- Vorbehaltene Datenschutz-, Transparenz- und Cookie-Vorgaben nicht durch einen Website-Import überschreiben.
- Externe Drittanbieter-Medien, Skripte und Schriftarten bestehen zum Teil weiterhin; vor einer vollständigen Selbst-Hosting-Behauptung gesondert prüfen.
- Öffentliche Suche erst mit bestätigten nutzbaren Produktdaten, ohne erfundene Livepreise. Bei nur einem Angebot keine Aussage als günstigster Händler.
- Niemals vertrauliche B2B-Einkaufspreise, E-Mails, Passwörter oder Authentifizierungsschlüssel in dieses öffentliche Repository übertragen.

## Betrieb und Rückfallweg

- Vor Release: CI-Prüfung, PR-Review, Hauptfunktionen und Rechtstexte prüfen.
- Nach Release: nbhandel.de, Unterseiten, Bilder/CSS/JS, HTTPS und GitHub-Actions-Abschluss live prüfen.
- Bei Regression: Freigegebenen Merge-Commit revertieren bzw. vorherige Git-Quelle wiederherstellen und den EINEN Pages-Workflow erneut ausführen; keine alten Webflow-Workflows reaktivieren.
- Die Domain und DNS-Zuordnung bleiben unverändert.
