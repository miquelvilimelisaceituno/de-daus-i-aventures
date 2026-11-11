Feature: Autenticació i perfil
  Com a usuari, vull iniciar sessió i tenir un perfil per accedir a les meves campanyes.

  Scenario: Primer login: es crea el perfil
    Given l'usuari "pau" ha iniciat sessió a Firebase
    When envia el seu perfil amb el nom "Pau"
    Then la resposta té el codi 200
    And existeix l'usuari "pau" amb el nom "Pau"

  Scenario: Petició a l'API sense iniciar sessió
    When es consulta el perfil sense token
    Then la resposta té el codi 401

  Scenario: Nom massa llarg
    Given l'usuari "pau" ha iniciat sessió a Firebase
    And ja té el perfil creat
    When canvia el seu nom per un de 41 caràcters
    Then la resposta té el codi 400