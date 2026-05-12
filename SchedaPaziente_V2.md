# PMApp v2 - Specifiche Tecniche Scheda Paziente

Questo documento contiene le specifiche dettagliate per lo sviluppo della Scheda Paziente all'interno di PMApp v2. Cursor deve utilizzare queste definizioni come unica fonte di verità per la struttura dei dati e la logica di visualizzazione.

## 1. Architettura e Concorrenza
- **Multi-utenza:** Il sistema deve supportare l'apertura simultanea dello stesso paziente da parte di più utenti.
- **Aggiornamenti Granulari:** Utilizzare `updateDoc` di Firestore per modificare solo i singoli campi interessati, evitando la sovrascrittura di dati non toccati dall'utente corrente.
- **Logica Real-time:** Utilizzare `onSnapshot` per riflettere istantaneamente le modifiche su tutti i dispositivi connessi.

---

## 2. Sezione 1: Dati Generali
Questa sezione gestisce lo stato di apertura e l'identificazione rapida del paziente.

| Campo | Tipo / Descrizione | Note e Logica |
| :--- | :--- | :--- |
| **ID univoco** | UUID | Nascosto all'utente. |
| **APERTO?** | Booleano | Definisce se la scheda è in sola lettura (CHIUSO) o modificabile (APERTO). |
| **ID Paziente** | Stringa (`P_count`) | Identificativo progressivo visibile. Reset possibile da Impostazioni Manifestazione. |
| **Apertura Scheda** | Timestamp | Automatico all'apertura, ma modificabile. |
| **Tipo Paziente** | Scelta Rapida | Opzioni: "Trasportato", "Autopresentato". |
| **Breve Descrizione** | Testo Lungo | Descrizione libera del caso. |
| **Codice Colore** | Scelta Rapida | Colori: Bianco, Verde, Giallo, Rosso. |
| **Trasportato da** | Testo Breve | Visibile/Editabile SOLO se l'utente è **CENTRALE**. |
| **Note Centrale** | Testo Breve | Visibile/Editabile SOLO se l'utente è **CENTRALE**. |
| **ETA PMA** | Countdown | Inserimento minuti (SOLO se "Trasportato" e utente **CENTRALE**). Mostra alert allo scadere. |
| **STATO** | Scelta Rapida | "In arrivo" (default se CENTRALE), "In attesa", "In carico" (default altri), "Errore" (richiede note), "Dimesso". |

---

## 3. Sezione 2: Dati Anagrafici
Identificazione del paziente (Pettorale per eventi sportivi).

| Campo | Tipo / Descrizione | Note e Logica |
| :--- | :--- | :--- |
| **Pettorale** | Numero | Opzionale. |
| **Nome** | Testo Breve | |
| **Cognome** | Testo Breve | |
| **Data di Nascita** | Data | |
| **Età** | Numero | Calcolata automaticamente dalla Data di Nascita. |
| **Email / Tel** | Testo | Telefono deve supportare il prefisso internazionale (+). |

---

## 4. Sezione 3: Cartella Clinica
Il cuore operativo per Medici e Infermieri.

### 4.1 Valutazione e Anamnesi
- **APR (Anamnesi Patologica Remota):** Testo lungo (Default: "Nulla.").
- **Allergie:** Testo breve (Default: "Nega.").
- **APP (Anamnesi Patologica Prossima):** Testo lungo.
- **EO (Esame Obiettivo):** Testo lungo (usare componente `QuickExamField` per opzioni rapide).

### 4.2 Parametri Vitali (PV)
Blocco ripetibile tramite pulsante **"Aggiungi Parametri"**. Ogni rilievo include:
- **Timestamp e Operatore:** Registrati automaticamente.
- **GCS:** 1-15 (Default: 15).
- **FR:** Numero (Default: 12).
- **SpO2 AA / O2:** Percentuali.
- **FC:** Battiti (Default: 80).
- **PA (Sistolica/Diastolica):** Numeri (Default: 130/80).
- **Temp / NRS:** Temperatura e dolore (0-10).

### 4.3 Terapie e Prestazioni
- **Prestazioni:** Scelta multipla da elenco definito in `Impostazioni_IMP`.
- **Farmaci:** Pulsante **"Aggiungi Farmaco"** (Editabile solo da **MEDICO** o **INFERMIERE**).
  - Selezione da elenco `FARMACI_IMP` o inserimento manuale.
  - Campi: Nome, Dose, Via (EV, OS, IM, SC), Timestamp.

### 4.4 Rivalutazione
Pulsante **"Aggiungi Rivalutazione"** per inserire note di testo libero con timestamp e firma utente.

---

## 5. Sezione 4: Dimissione
**Modificabile SOLO dal MEDICO.** Gli altri ruoli vedono in sola lettura.

| Campo | Tipo / Descrizione | Note e Logica |
| :--- | :--- | :--- |
| **Esito** | Scelta Singola | Dimissione, PS, MMG, Rifiuto, Allontanamento, Riaffidato. |
| **Note Dimissione**| Testo Lungo | |
| **Dati Affidatario**| Campi Extra | Richiesti solo se Esito = "Riaffidato a". |
| **Firma Paziente** | Firma Digitale | Acquisizione touch/mouse. |
| **Firma Medico** | Immagine/Auto | Caricata dal profilo utente medico. |
| **Pulsante DIMETTI**| Azione Finale | Chiede conferma, chiude la scheda e la rende non modificabile. |
