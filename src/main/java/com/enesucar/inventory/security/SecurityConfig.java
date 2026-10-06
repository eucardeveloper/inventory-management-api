package com.enesucar.inventory.security;

import com.enesucar.inventory.filter.LoginRateLimitFilter;
import com.enesucar.inventory.filter.OriginCheckFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // enables @PreAuthorize on controllers/services
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter         jwtFilter;
    private final OriginCheckFilter originCheckFilter;
    private final LoginRateLimitFilter loginRateLimitFilter;
    private final UserDetailsService userDetailsService;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:3002}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Spring's CSRF-token mechanism is switched off on purpose, but NOT because the API is
                // "stateless": the JWT is in a cookie that browsers send automatically. CSRF is handled
                // by SameSite=Strict cookies + OriginCheckFilter + JSON-only bodies (see OriginCheckFilter).
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        // Actuator is served on its own management port (management.server.port), which is
                        // not published outside the Docker network. Only health/info/prometheus are open
                        // there so Prometheus can scrape; /actuator/metrics and the rest need ADMIN.
                        .requestMatchers("/actuator/health", "/actuator/info", "/actuator/prometheus").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")

                        // Everyone who is signed in may read
                        .requestMatchers(HttpMethod.GET, "/api/**")
                            .hasAnyRole("ADMIN", "WAREHOUSE_MANAGER", "STAFF")

                        // Booking a movement is floor work; STAFF is allowed
                        .requestMatchers(HttpMethod.POST, "/api/warehouse/movements")
                            .hasAnyRole("ADMIN", "WAREHOUSE_MANAGER", "STAFF")

                        // Reversal is a supervisory action — separating "can book"
                        // from "can undo" is what gives the audit trail its meaning
                        .requestMatchers(HttpMethod.POST, "/api/warehouse/movements/*/reverse")
                            .hasAnyRole("ADMIN", "WAREHOUSE_MANAGER")

                        // Master data (products, suppliers, users) is managed, not operated
                        // PUT/PATCH/DELETE require ADMIN or WAREHOUSE_MANAGER
                        .requestMatchers(HttpMethod.PUT, "/api/**")
                            .hasAnyRole("ADMIN", "WAREHOUSE_MANAGER")
                        .requestMatchers(HttpMethod.PATCH, "/api/**")
                            .hasAnyRole("ADMIN", "WAREHOUSE_MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/**")
                            .hasAnyRole("ADMIN", "WAREHOUSE_MANAGER")

                        // POST (create) also requires ADMIN or WAREHOUSE_MANAGER (except movements which is above)
                        .requestMatchers(HttpMethod.POST, "/api/**")
                            .hasAnyRole("ADMIN", "WAREHOUSE_MANAGER")

                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(loginRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(originCheckFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS: allow the Next.js dev server and the Dockerised frontend.
     * allowCredentials = true is required for the browser to send HttpOnly cookies
     * cross-origin (localhost:3000 → localhost:8083).
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);   // app.cors.allowed-origins
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);  // required for cookies to be sent cross-origin

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
