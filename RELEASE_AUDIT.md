# NBHandel Website – Release Audit 2026-10-01

Release-Kandidat auf Basis des kanonischen FULL-Builds. Bestehende FULL-Dateien, Runtime-IDs und Script-Einbindungen wurden verlustfrei erhalten.

## Neu im finalen Kandidaten
- Live-Kamera-Scanner für Smartphone/Desktop: Mehrfachscan, lokaler Verlauf, direkte Übergabe an Produktpass/Angebotsvergleich, Kamerawechsel/Taschenlampe soweit vom Gerät angeboten sowie Foto-/Manuell-Fallback.
- Angebots-Check mit 8 strukturierten Prüfpunkten, lokaler Speicherung und Text-Export.
- Merkliste v3 mit Filter, Sortierung, Priorität, Tags, Notizen und optionalem Zielpreis.
- PWA-Manifest, Suchindex, Sitemap und Offline-Cache um die neue Funktion erweitert.

## Statischer Qualitätsaudit
- 0 kaputte interne Links/Assets
- 0 doppelte HTML-IDs
- alle indexierbaren Seiten mit genau einem H1, Title, Description und Canonical
- alle Formfelder mit zugänglicher Beschriftung
- alle Bilder mit alt-Attribut
- alle target=_blank-Links mit noopener
- alle JavaScript-Dateien: Syntax PASS
- manifest.webmanifest/search-index.json: Parse PASS
- sitemap.xml/feed.xml/opensearch.xml: Parse PASS
- FULL→Release: keine Datei, Runtime-ID oder Script-Einbindung verloren

## Ehrliche Funktionsgrenze
Live-Händlerdaten, automatische Preisalarme und Cloud-Konten werden nicht simuliert. Sie bleiben externe/infrastrukturelle Gates, bis reale autorisierte Daten und Dienste verfügbar sind.

## Scanner-Testgrenze
- Scanner-DOM, Links, Query-Übergabe, Local-Storage-Historie und JavaScript-Syntax sind im Release-Audit enthalten.
- Geräteabhängiger Kamera-Pfad (Kameraberechtigung, Taschenlampe, Kamerawechsel und native BarcodeDetector-Unterstützung) muss nach dem HTTPS-Deployment einmal auf einem realen Smartphone verifiziert werden; nicht unterstützte Geräte fallen auf Foto-/Manuell-Eingabe zurück.
