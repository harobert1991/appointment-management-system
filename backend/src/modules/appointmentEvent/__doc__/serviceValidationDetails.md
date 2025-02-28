# Validations dans `appointmentEvent.services.ts`

Ce document décrit les validations principales intégrées dans le service de gestion des rendez-vous (AppointmentEventService). Ces validations s'effectuent avant la création, la mise à jour ou l'annulation d'un rendez-vous.

---

## 1. Validation des champs obligatoires et des plages de dates  
**Méthode concernée : `validateRequiredFields`**

- **Champs obligatoires :**  
  - Vérifie que les champs suivants sont présents dans les données d'entrée :  
    - `startDateTime`
    - `endDateTime`
    - `participants`
    - `appointmentType`
  - **Erreur levée :** Si l'un de ces champs manque, une erreur est lancée avec le message :  
    `Missing required fields: <liste des champs manquants>`

- **Validation de la plage de dates :**  
  - **Ordre des dates :**  
    - Vérifie que `startDateTime` est strictement antérieur à `endDateTime`.  
    - **Erreur levée :** Si `startDateTime` est supérieur ou égal à `endDateTime`, lance l'erreur :  
      `End date must be after start date`
  
  - **Durée minimale :**  
    - La durée de l'événement doit être d'au moins 15 minutes (15 * 60 * 1000 millisecondes).  
    - **Erreur levée :** Si la durée est inférieure, lance l'erreur :  
      `Appointment must be at least 15 minutes long`

- **Validation des participants :**  
  - Vérifie que le tableau `participants` contient au moins un élément.  
  - **Erreur levée :** Si le tableau est vide, lance l'erreur :  
    `At least one participant is required`

---

## 2. Vérification des conflits d'horaires  
**Méthode concernée : `checkForConflicts`**

Cette méthode s'assure qu'il n'existe pas de conflits de planification avec d'autres rendez-vous actifs (excluant ceux annulés ou terminés).

- **Conflit pour le prestataire (`providerId`) :**  
  - Recherche des rendez-vous dont les plages horaires se chevauchent avec celles du rendez-vous à créer ou à modifier.  
  - **Erreur levée :** Si un conflit est détecté pour le prestataire, lance l'erreur :  
    `Provider has a scheduling conflict`

- **Conflit pour les participants :**  
  - Vérifie si l'un des identifiants de participants se trouve déjà dans un autre rendez-vous dont la plage horaire chevauche celle proposée.  
  - **Erreur levée :** Si un conflit est détecté pour l'un ou plusieurs participants, lance l'erreur :  
    `One or more participants have scheduling conflicts`

---

## 3. Validation des transitions de statut  
**Méthode concernée : `validateStatusTransition`**

Cette validation garantit que le changement de statut d'un rendez-vous respecte les règles définies.

- **Transitions autorisées :**
  - **Depuis `SCHEDULED` :**  
    - Les transitions possibles sont vers `CONFIRMED` ou `CANCELLED`
  - **Depuis `CONFIRMED` :**  
    - Les transitions possibles sont vers `COMPLETED`, `CANCELLED` ou `NO_SHOW`
  - **Depuis `CANCELLED`, `COMPLETED` ou `NO_SHOW` :**  
    - Aucune transition n'est autorisée

- **Erreur levée :**  
  - Si la transition demandée n'est pas valide par rapport à l'état actuel, lance l'erreur :  
    `Invalid status transition from <statut actuel> to <nouveau statut>`

---

## 4. Validation lors de l'annulation d'un rendez-vous  
**Méthode concernée : `cancelAppointment`**

Avant d'annuler un rendez-vous, plusieurs vérifications sont effectuées :

- **Existence du rendez-vous :**  
  - Vérifie que le rendez-vous existe.  
  - **Erreur levée :** Si non trouvé, lance l'erreur :  
    `Appointment not found`

- **Statut déjà annulé :**  
  - Si le rendez-vous est déjà en statut `CANCELLED`, l'annulation ne peut pas être effectuée.  
  - **Erreur levée :** Lance l'erreur :  
    `Appointment is already cancelled`

- **Rendez-vous terminé :**  
  - Si le rendez-vous est en statut `COMPLETED`, il ne peut pas être annulé.  
  - **Erreur levée :** Lance l'erreur :  
    `Cannot cancel a completed appointment`

---

Ce fichier regroupe l'ensemble des validations réalisées dans le service de rendez-vous, garantissant la cohérence des données (dates, participants, conflits, transitions de statut) avant toute création, modification ou annulation d'un rendez-vous.