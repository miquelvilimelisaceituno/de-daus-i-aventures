Feature: Crear campanyes i veure les meves
  Com a usuari, vull crear campanyes i veure aquelles on soc membre amb el meu rol (HU-10, HU-13).

  Background:
    Given l'usuari "miquel" té el perfil creat

  Scenario: Crear una campanya
    When el "miquel" crea la campanya "El final infinit"
    Then la resposta té el codi 201
    And el "miquel" veu "El final infinit" a les seves campanyes amb el rol "master"
    And el "miquel" veu el codi d'invitació de "El final infinit"

  Scenario: Nom massa curt
    When el "miquel" crea la campanya "EF"
    Then la resposta té el codi 400
    And el "miquel" no té cap campanya

  Scenario: Només veu les campanyes on és membre
    Given l'usuari "laia" té el perfil creat
    And el "miquel" ha creat la campanya "El final infinit"
    And la "laia" ha creat la campanya "Una altra"
    When la "laia" consulta les seves campanyes
    Then només veu la campanya "Una altra"