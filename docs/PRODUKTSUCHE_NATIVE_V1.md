# NBHandel: native Produktsuche auf der bestehenden Website

## Ziel und Abgrenzung

Diese Änderung erweitert den veröffentlichten NBHandel-Stand aus GitHub main. Sie ersetzt die Website NICHT. Die vorhandene Gestaltung, Navigation, Logo, Hintergrundvideos, Produktkarussell, sieben Kategorien, bestehenden Werkzeuge sowie die übrigen Seiten bleiben erhalten. Der zuvor verworfene Komplett-Neubau aus PR #2 wird nicht integriert.

## Bearbeiteter Funktionsumfang

- Homepage (site/index.html): Der vorhandene v34/v60-Produktsuchbereich wird mit denselben Bedienelementen weiterverwendet. Alle 24 bisherigen Produktbeispiele erscheinen statt nur sieben mit historischen Preisen. Eingaben führen direkt zu /produkte?q=Suchbegriff.
- Produktseite (site/produkte.html): Direkt im bisherigen dunklen Hero erscheint ein Suchformular. Ergebnisse, Kategoriefilter und Produktdetails erscheinen im normalen Inhaltsfluss darüberliegender oder danebenliegender bestehender Texte wird nichts gelegt. Die sieben bisherigen großen Kategoriekarten und Kaufwerkzeug-Links bleiben unverändert.
- CSS (site/assets/search/native-search.css): Nur gezielte Zusatzstile passend zur bisherigen NBHandel-v49-Gestaltung.
- Suchmodul (site/assets/search/native-search.mjs): Sichere Treffer-, Detail- und Filterdarstellung aus einem kleinen lokalen Datensatz.
- Such-/Identitätskern (site/assets/search/finder-core.mjs): Aus dem alten verworfenen Prototyp selektiv wiederverwendete, getestete Fachlogik, kein UI-Neubau.
- Quelldatensatz (site/data/search/original-products.v1.json): Genau 24 bestehende Beispielnamen mit lokalen Bildern und ursprünglicher Attribution, null aktuelle Händlerangebote.
- Extraktion (tools/build_native_search_catalog.py): Reproduzierbar aus dem tatsächlich veröffentlichten NBHandel-Quellstand, keine fremden Webseiten besucht.
- Regression (tests/search/native-search.test.mjs): Produktnamen, Suche, GTIN, keine Datenrechte-Überbrückung, Erhaltung der Originalkomponenten.

## Nächste Datenstufe

Ein echtes Angebot benötigt nachweisbar genehmigtes Händlerprogramm, Produktfeed und Produktidentität; Preis plus Versand sind getrennt zu behandeln. Ein einziges Angebot ist ein Einstieg in eine Produktsuche, noch kein Mehrhändler-Preisvergleich. Die Demo erfindet keine GTIN, Produktpreise, Händlerlinks oder Affiliate-Cookies. Millionen Artikel müssen später mit einer serverseitigen Suche verarbeitet werden; der kleine Testdatensatz ist nicht das künftige Skalierungsmodell.

## Prüf- und Freigabegrenze

- Statische Websitevalidierung: alle ursprünglichen 58 Routen und deren Ressourcen intakt.
- Browser-Prüfung: originale Homepage mit Hero-Video und Vergleich bleibt erhalten; neue Suche liefert Dyson V8 sowie zwei AirPods-Beispiele korrekt; Detail- und Kategorienwege funktionieren bei 1440 und 390 px ohne horizontales Überlaufen.
- Der bestehende Homepage-Script-Bestand weist bereits vor der Änderung einen separaten insertBefore-Konsolenfehler auf. Diesen nicht der neuen Suche zurechnen; getrennt untersuchen.
- Keine Produktfeed-Aktivierung, kein Tracking, keine registrierungs-, Zahlungs- oder Händleraktionen.
- Entwicklung erfolgt auf separatem GitHub-Branch. Keine Live-Veröffentlichung ohne abschließende Prüfung und Freigabe.
