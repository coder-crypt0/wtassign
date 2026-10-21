package com.crease.api;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.util.Map;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> status(ResponseStatusException e, HttpServletRequest request) { return response(e.getStatusCode().value(), e.getReason(), request); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException e, HttpServletRequest request) {
        String message = e.getBindingResult().getFieldErrors().stream().map(f -> f.getField() + " " + f.getDefaultMessage()).sorted().findFirst().orElse("Invalid request.");
        return response(400, message, request);
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class, org.springframework.web.bind.MissingServletRequestParameterException.class})
    public ResponseEntity<?> malformed(Exception e, HttpServletRequest request) { return response(400, "Invalid request. Check the supplied values and required fields.", request); }
    private ResponseEntity<?> response(int status, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(Map.of("status", status, "message", message == null ? "Request failed." : message, "path", request.getRequestURI()));
    }
}
