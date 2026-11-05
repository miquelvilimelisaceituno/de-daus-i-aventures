Feature: Consultar les campanyes
  Com a usuari, vull veure les campanyes per poder entrar-hi.
  Provisional (D27): fins a F0/F1 es mostren totes les campanyes no arxivades.

  Scenario: Llistar les campanyes existents
    Given existeix la campanya "El final infinit" amb el codi "DRAC2024"
    When es consulten les campanyes
    Then la resposta inclou la campanya "El final infinit"
    And cap campanya mostra el codi d'invitació
