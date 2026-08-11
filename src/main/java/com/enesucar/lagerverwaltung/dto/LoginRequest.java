package com.enesucar.lagerverwaltung.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String benutzername;
    private String passwort;
}