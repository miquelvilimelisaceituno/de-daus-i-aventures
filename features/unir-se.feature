Feature: Unir-se a una campanya amb un codi
  Com a usuari, vull unir-me a una campanya amb un codi per ser-ne jugador (HU-12).
  El màster pot regenerar el codi (HU-11), tancar les invitacions i limitar els jugadors (HU-16).

  Background:
    Given la campanya "El final infinit" amb el màster "Miquel" i el codi "DRAC2024"
    And la campanya admet 6 jugadors i en té 3

  Scenario: Codi vàlid
    When la "Laia" s'uneix amb el codi "DRAC2024"
    Then la "Laia" veu "El final infinit" a les seves campanyes amb el rol "Jugador"

  Scenario: Codi incorrecte
    When la "Laia" s'uneix amb el codi "XXXX0000"
    Then veu l'error "Codi no vàlid"
    And la "Laia" no forma part de cap campanya

  Scenario: Ja forma part de la campanya
    Given la "Laia" ja és jugadora de "El final infinit"
    When la "Laia" s'uneix amb el codi "DRAC2024"
    Then veu l'error "Ja formes part d'aquesta campanya"
    And la "Laia" continua tenint una sola pertinença

  Scenario: La campanya no admet més jugadors
    Given el màster ha tancat les invitacions
    When la "Laia" s'uneix amb el codi "DRAC2024"
    Then veu l'error "Aquesta campanya no admet nous jugadors"

  Scenario: La campanya és plena
    Given el màster ha limitat la campanya a 3 jugadors
    When la "Laia" s'uneix amb el codi "DRAC2024"
    Then veu l'error "Aquesta campanya no admet nous jugadors"

  Scenario: Codi regenerat
    Given el màster ha regenerat el codi
    When la "Laia" s'uneix amb el codi "DRAC2024"
    Then veu l'error "Codi no vàlid"