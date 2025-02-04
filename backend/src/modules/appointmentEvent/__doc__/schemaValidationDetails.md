# Liste des validations dans `appointmentEvent.schema.ts`

Ce document récapitule les validations essentielles appliquées dans le schéma `AppointmentEvent`. Ces validations concernent notamment les champs suivants : participants, status, appointmentType, providerId, clientId, reminderSettings, cancellationReason, additionalNotes ainsi que des vérifications supplémentaires dans le middleware pré-enregistrement.

---

## 1. Champ `participants`

### Validations au niveau de chaque participant (objet de l'array) :
- **`userId`** :
  - **Type** : `Schema.Types.ObjectId`
  - **Validation** : Champ requis
  - **Message d'erreur** : "Participant userId is required"

- **`role`** :
  - **Type** : `String`
  - **Validation** :
    - Champ requis
    - Doit appartenir aux valeurs autorisées : `['provider', 'client', 'other']`
  - **Message d'erreur** :
    - Requis : "Participant role is required"
    - Enum : "{VALUE} is not a valid participant role"

- **`name`** :
  - **Type** : `String`
  - **Validation** :
    - Champ requis
    - Valeur nettoyée (`trim`)
    - Longueur minimale de 2 caractères
  - **Message d'erreur** :
    - Requis : "Participant name is required"
    - Minlength : "Name must be at least 2 characters long"

- **`email`** (facultatif) :
  - **Type** : `String`
  - **Validation** : Si fourni, doit correspondre à une expression régulière valide pour un email  
    - **Message d'erreur** : "Invalid email format"

- **`phone`** (facultatif) :
  - **Type** : `String`
  - **Validation** : Si fourni, doit correspondre à une expression régulière valide pour un numéro de téléphone  
    - **Message d'erreur** : "Invalid phone number format"

### Validations au niveau du tableau `participants` :
- **Validation 1** :
  - **Règle** : Le tableau doit contenir au moins un participant.
  - **Message d'erreur** : "At least one participant is required"

- **Validation 2** :
  - **Règle** : Le tableau doit contenir au moins un participant ayant le rôle `provider` ou `client`.
  - **Message d'erreur** : "Appointment must have at least one provider or client"

---

## 2. Champ `status`

- **Type** : `String`
- **Enum** : Les valeurs possibles sont celles définies dans `AppointmentStatus`  
  - **Message d'erreur** : "{VALUE} is not a valid appointment status"
- **Requis** : Oui  
  - **Message d'erreur** : "Appointment status is required"
- **Valeur par défaut** : `AppointmentStatus.SCHEDULED`
- **Validation personnalisée pour les transitions de status** :
  - Pour un document existant (non nouveau), la transition de status doit respecter les règles suivantes :
    - **De `SCHEDULED`** : transitions autorisées vers `CONFIRMED` ou `CANCELLED`
    - **De `CONFIRMED`** : transitions autorisées vers `COMPLETED`, `CANCELLED` ou `NO_SHOW`
    - **De `CANCELLED`, `COMPLETED`, `NO_SHOW`** : aucune transition n'est autorisée
  - **Message d'erreur** : "Invalid status transition"

---

## 3. Champ `appointmentType`

- **Type** : `String`
- **Enum** : Les valeurs possibles sont celles définies dans `AppointmentType`  
  - **Message d'erreur** : "{VALUE} is not a valid appointment type"
- **Requis** : Oui  
  - **Message d'erreur** : "Appointment type is required"

---

## 4. Champ `providerId`

- **Type** : `Schema.Types.ObjectId`
- **Référence** : 'User'
- **Validation asynchrone** :
  - Si une valeur est fournie, le `User` correspondant doit exister et avoir le rôle `provider`
  - **Message d'erreur** : "Provider not found or invalid"

---

## 5. Champ `clientId`

- **Type** : `Schema.Types.ObjectId`
- **Référence** : 'User'
- **Validation asynchrone** :
  - Si une valeur est fournie, le `User` correspondant doit exister
  - **Message d'erreur** : "Client not found"

---

## 6. Champ `reminderSettings` (tableau)

Chaque objet de rappel doit respecter les validations suivantes :

- **`type`** :
  - **Type** : `String`
  - **Enum** : Valeurs autorisées : `['email', 'sms', 'push']`
  - **Requis** : Oui
  - **Message d'erreur** : "{VALUE} is not a valid reminder type"

- **`timeBeforeEvent`** :
  - **Type** : `Number`
  - **Requis** : Oui
  - **Min** : 5 (minutes)  
    - **Message d'erreur** : "Reminder must be set at least 5 minutes before event"
  - **Max** : 10080 (minutes, soit 1 semaine)  
    - **Message d'erreur** : "Reminder cannot be set more than 1 week before event"

- **`isEnabled`** :
  - **Type** : `Boolean`
  - **Valeur par défaut** : `true`

---

## 7. Champ `cancellationReason`

Ce champ comporte plusieurs sous-champs qui ne sont requis que si le status est `CANCELLED` :

- **`reason`** :
  - **Type** : `String`
  - **Requis** : Conditionnel (si `status === AppointmentStatus.CANCELLED`)
  - **Nettoyage** : `trim`
  - **Minlength** : 10 caractères  
    - **Message d'erreur** : "Cancellation reason must be at least 10 characters long"

- **`cancelledBy`** :
  - **Type** : `Schema.Types.ObjectId`
  - **Référence** : 'User'
  - **Requis** : Conditionnel (si `status === AppointmentStatus.CANCELLED`)

- **`cancelledAt`** :
  - **Type** : `Date`
  - **Valeur par défaut** : `Date.now`

---

## 8. Champ `additionalNotes`

- **Type** : `String`
- **Nettoyage** : `trim`
- **Maxlength** : 1000 caractères  
  - **Message d'erreur** : "Additional notes cannot exceed 1000 characters"

---

## 9. Validations dans le Middleware `pre('save')`

Avant l'enregistrement du document, deux vérifications supplémentaires sont effectuées :

### a. Vérification de la raison d'annulation
- **Condition** : Si `status === AppointmentStatus.CANCELLED`
- **Vérification** : Le champ `cancellationReason` doit être présent.
- **Action** : Si non renseigné, une erreur est levée avec le message :
  - "Cancellation reason is required when status is cancelled"

### b. Vérification des temps de rappel
- **Pour chaque objet dans `reminderSettings`** :
  - Calcul du temps de rappel : `startDateTime` moins `timeBeforeEvent` (converti en millisecondes)
  - **Condition** : Le temps calculé ne doit pas être dans le passé (inférieur à la date/heure actuelle)
  - **Action** : Si un rappel est prévu dans le passé, une erreur est levée avec le message :
    - "Reminder time cannot be in the past"

---

Ce document regroupe l'ensemble des validations mises en œuvre dans le schéma `AppointmentEvent`. Vous pouvez vous y référer pour comprendre les règles de validation appliquées et adapter les messages ou conditions au besoin.