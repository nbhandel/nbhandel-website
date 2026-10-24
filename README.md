# NBHandel – Live-Website: GitHub als maßgebliche Quelle

**Produktionsstand:** Die aktuelle Webflow-gestaltete Website wurde aus der öffentlichen Liveversion in den Ordner `site/` übernommen (58 Seiten, lokale CDN-Assets). Nur dieses Verzeichnis wird vom einzigen GitHub-Pages-Workflow `.github/workflows/pages.yml` veröffentlicht. Beim Deployment wird **nicht aus Webflow geladen**.

**Weiterentwicklung:** Branch + Pull Request, Prüfung mit `python3 tools/verify_site.py site`, anschließend bewusstes Merge nach `main`. Datenschutz-/Cookie-Vorbereitung und vorhandene Website-Funktionen bleiben erhalten; Affiliate-Produktfeeds und Tracking sind noch nicht neu aktiviert.

Betriebsanleitung: `docs/WEBSITE_LIVE_BETRIEB.md`. Die älteren HTML-Dateien im Repository-Stamm sind **historischer Code und nicht die aktuelle Produktionsquelle**.

---

## Historische Projektbeschreibung vor der GitHub-Quellumstellung

### Ursprüngliche statische Version vom 01.10.2026

Statische Portalversion mit maximal sinnvollen Browserfunktionen ohne erfundene Live-Marktdaten.

## Inhalt
- 13 ausgebaute Themenwelten
- 16 Ratgeber + FAQ + Glossar + Methodik + Transparenz/Affiliate-Hinweis
- globale Suche und Seitensuche
- Produktpass (lokal, CSV)
- Angebotsvergleich bis 6 Angebote (lokal, CSV, Share-Link)
- Deal-Check
- manuelle Preisbeobachtung mit Verlauf/Zielpreis und CSV
- Kaufmatrix mit Gewichtungen, CSV und Share-Link
- Merkliste mit Tags/Notizen und CSV
- Live-Kamera-Scanner für EAN/GTIN/UPC mit Mehrfachscan, lokaler Historie, Kamerawechsel/Taschenlampe soweit unterstützt sowie Foto-/Manuell-Fallback
- 18+ Rechner/Prüfer inkl. GTIN/Barcode, Gesamtpreis, Grundpreis, Strom, Break-even, Finanzierung, Cashback, Abo, Brutto/Netto und URL-Bereinigung
- Rückgabe-/Serviceplaner für selbst eingegebene Fristen
- Local-Storage Export/Import/Löschen
- Dark Mode, Teilen/Drucken, Artikel-Inhaltsverzeichnis, Lesefortschritt, zuletzt angesehen
- PWA/Offline-Grundlage mit Shortcuts
- RSS, sitemap, OpenSearch, 404, security.txt, humans.txt, strukturierte Daten und OG-Card

## Bewusst externes Gate
- automatische Händlerangebote: erst mit autorisiertem rights-cleared Produktfeed
- automatische Preisalarme: erst mit Live-Daten und Benachrichtigungsserver
- Cloudkonto/Sync: erst mit sicherer Authentifizierung

Keine Fake-Preise, keine erfundenen Tests, keine Schein-Accounts, kein eigenes Tracking.


## FINAL release extensions
- Angebots-Check mit 8 strukturierten Prüfpunkten, lokaler Speicherung und Text-Export.
- Merkliste v3 mit Filter, Sortierung, Priorität, Tags, Notizen und optionalem Zielpreis.
- Suchindex, Sitemap und Offline-Cache um neue Funktionen erweitert.
