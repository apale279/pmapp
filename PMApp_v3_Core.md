# PMApp v3 - Specifiche Core (Senza logiche Rank)

Questo documento contiene le specifiche per lo sviluppo del cuore pulsante della versione 3 di PMApp. Cursor deve utilizzare queste definizioni per implementare il campo Lesioni, la Sezione 5 e il sistema di Impostazioni dinamiche.

## 1. Campo LESIONI (Sezione 3: Cartella Clinica)
Il campo "LESIONI" deve essere posizionato dopo l'Esame Obiettivo (EO).

- **Componente Visivo:** Visualizzare un'immagine vettoriale (SVG) di un omino stilizzato (vista frontale e vista posteriore).
- **Interazione:** - L'utente clicca su un punto specifico del corpo.
  - Al clic, viene aggiunto un marker (puntino colorato) con un numero progressivo (1, 2, 3...).
  - Contemporaneamente, viene creata una casella di testo associata a quel numero (es: "1. [Testo descrittivo]").
- **Salvataggio:** Salvare le coordinate (x, y), il numero del marker e il testo descrittivo nel documento del paziente su Firestore.

---

## 2. Sistema di Impostazioni (Impostazioni Manifestazione & PMA)
Le impostazioni sono divise in due livelli di dipendenza.

### 2.1 IMP_GENERALI (Dipendenza Manifestazione)
Valide per tutti i PMA dell'evento.
- **Campi:**
  - **Tipo Evento:** Elenco gestibile per la selezione in Dati Generali.
  - **Dettaglio Evento:** Elenco gestibile, collegato al "Tipo Evento".
  - **Dettaglio EO Rapido:** Liste predefinite di voci per categorie (NEUROLOGICO, CUTE, TORACE, ADDOME, CAPO/COLLO) da usare nel campo EO.
  - **Elenco Prestazioni:** Popola il menu a tendina "Prestazioni" in Cartella Clinica.
  - **Elenco Farmaci:** Popola il menu a tendina "Farmaci" in Cartella Clinica.
  - **Numeri Utili:** Tabella (Nome, Numero, Note).

### 2.2 IMP_PMA (Dipendenza Singolo PMA)
Valide solo per il PMA corrente.
- **Farmaci Usati:** Elenco popolato automaticamente in background ogni volta che un farmaco viene aggiunto a una scheda paziente.

---

## 3. Sezione 5: DATI INVIO OSPEDALE
Questa sezione deve apparire **SOLO SE** l'Esito nella Sezione 4 (Dimissione) è impostato su **"Invio in PS"**.

- **Eccezione di Blocco:** È l'unica sezione che rimane **EDITABILE** anche dopo che la scheda paziente è stata "CHIUSA" (`APERTO? === false`).
- **Campi:**
  - N° missione AREU (Numero)
  - Data e ora (Timestamp automatico, modificabile)
  - Mezzo (Testo)
  - Ospedale di destinazione (Testo)
  - Codice trasporto (Verde, Giallo, Rosso)
  - Note trasporto (Testo)
