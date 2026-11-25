Feature: Compendi de la campanya
  Com a màster, vull crear PNJ, localitzacions i faccions, mantenir-los en secret i revelar-los (HU-30, HU-32).
  Com a membre, vull cercar i filtrar el compendi (HU-33).
  Com a màster, vull arxivar una entitat sense perdre-la (HU-35).

  Background:
    Given la campanya "El final infinit" amb el màster "Miquel" i la jugadora "Laia"
    And al compendi hi ha el PNJ revelat "Àlex de Ponent" i la facció secreta "La Mà Negra"

  Scenario: Una entitat nova és secreta per defecte
    When el "Miquel" crea el PNJ "Brugal el Vell"
    Then el "Miquel" veu "Àlex de Ponent, Brugal el Vell, La Mà Negra" al compendi
    And la "Laia" veu "Àlex de Ponent" al compendi

  Scenario: El màster revela una entitat secreta
    When el "Miquel" revela "La Mà Negra"
    Then la "Laia" veu "Àlex de Ponent, La Mà Negra" al compendi

  Scenario: El jugador obre una entitat secreta per URL directa
    When la "Laia" obre "La Mà Negra"
    Then rep un «no trobat»

  Scenario: Un jugador no pot crear entitats
    When la "Laia" crea el PNJ "Brugal el Vell"
    Then veu l'error "No tens permís per fer això"
    And el "Miquel" veu "Àlex de Ponent, La Mà Negra" al compendi

  Scenario: La cerca no distingeix majúscules ni accents
    When la "Laia" cerca "ALEX"
    Then troba "Àlex de Ponent"

  Scenario: Una cerca sense resultats
    When la "Laia" cerca "drac"
    Then no troba cap entitat

  Scenario: Una entitat arxivada surt de les llistes però no es perd
    When el "Miquel" arxiva "Àlex de Ponent"
    Then la "Laia" no veu cap entitat al compendi
    And la "Laia" encara pot obrir "Àlex de Ponent"
