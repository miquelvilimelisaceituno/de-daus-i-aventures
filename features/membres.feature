Feature: Sortir d'una campanya o ser expulsat
  Com a jugador, vull sortir d'una campanya (HU-15).
  Com a màster, vull expulsar un jugador (HU-14).

  Background:
    Given la campanya "El final infinit" amb el màster "Miquel" i el codi "DRAC2024"
    And els jugadors "Laia" i "Pau"

  Scenario: Una jugadora surt de la campanya
    When la "Laia" surt de la campanya
    Then la "Laia" ja no veu "El final infinit" a les seves campanyes
    And la "Laia" no pot entrar a la campanya

  Scenario: El màster expulsa un jugador
    When el "Miquel" expulsa el "Pau"
    Then el "Pau" ja no veu "El final infinit" a les seves campanyes
    And els membres de la campanya són "Miquel, Laia"

  Scenario: Un jugador no pot expulsar un altre jugador
    When la "Laia" expulsa el "Pau"
    Then veu l'error "No tens permís per fer això"
    And els membres de la campanya són "Miquel, Laia, Pau"

  Scenario: El màster no pot sortir de la seva campanya
    When el "Miquel" surt de la campanya
    Then veu l'error "El màster no pot sortir de la seva campanya: arxiva-la o elimina-la"

  Scenario: Qui ha sortit pot tornar a entrar amb el codi
    Given la "Laia" ha sortit de la campanya
    When la "Laia" s'uneix amb el codi "DRAC2024"
    Then la "Laia" torna a veure "El final infinit" a les seves campanyes