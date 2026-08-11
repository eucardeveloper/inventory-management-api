package com.enesucar.lagerverwaltung.dto;

import com.enesucar.lagerverwaltung.entity.Benutzer;
import lombok.Data;

@Data
public class RegisterRequest {
    private String benutzername;
    private String passwort;
    private Benutzer.Rolle rolle;
}