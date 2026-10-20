package com.shield;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.Collections;

@SpringBootApplication
public class SmartShieldApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(SmartShieldApplication.class);
        // Explicitly enforce port 8080 as required by the specification
        app.setDefaultProperties(Collections.singletonMap("server.port", "8080"));
        app.run(args);
    }
}
