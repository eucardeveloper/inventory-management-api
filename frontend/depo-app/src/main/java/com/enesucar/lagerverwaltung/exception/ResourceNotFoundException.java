package com.enesucar.lagerverwaltung.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String mesaj) {
        super(mesaj);
    }
}