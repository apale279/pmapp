# PMApp v5 — Redesign interfaccia (stile medical professionale)

Obiettivo: dashboard ad alta densità, palette grigi freddi / bianchi, colore riservato a triage e alert clinici.

## Estetica
- Sfondo `#f8fafc`, card bianche, bordi `#e2e8f0`, ombre leggere.
- Testi dati 12–13px, titoli 14px; font Inter.
- Pulsanti `rounded-md`, outline sobri; triage con testo su fondo pieno.

## Dashboard PMA
- Header sottile: titolo a sinistra, azioni a destra (MAIUSCOLO, stessa altezza).
- Griglia ~75% / 25%: tabella densa in carico; sidebar in arrivo / attesa / ultimi dimessi.
- Colonne tabella: triage, paziente, età, motivo, riferimenti, tempo, stato, azioni.

## Dashboard centrale
- Barra occupazione PMA (posti letto vs pazienti attivi).
- Tabella coordinamento; ticker eventi in basso.

## Scheda paziente
- Blocchi tipo monitor; parametri vitali con card e alert su valori critici.
