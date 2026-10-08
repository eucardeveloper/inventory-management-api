package com.enesucar.inventory.security;

import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.service.AuthService;
import com.enesucar.inventory.service.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("JwtFilter")
class JwtFilterTest {

    private static final String SECRET = "jwt-filter-test-secret-key-minimum-256-bits-long";

    private JwtService jwtService;
    private UserDetailsService users;
    private JwtFilter filter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", SECRET);
        users = mock(UserDetailsService.class);
        filter = new JwtFilter(jwtService, users);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private static User user(String username, User.Role role) {
        User u = new User();
        u.setId(1L);
        u.setUsername(username);
        u.setPassword("irrelevant");
        u.setRole(role);
        return u;
    }

    private Authentication run(MockHttpServletRequest request) throws Exception {
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).as("the request always continues down the chain").isNotNull();
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private static List<String> authorities(Authentication auth) {
        return auth.getAuthorities().stream().map(a -> a.getAuthority()).toList();
    }

    private MockHttpServletRequest bearer(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }

    @Test
    @DisplayName("a valid bearer token authenticates the user")
    void validBearerTokenAuthenticates() throws Exception {
        when(users.loadUserByUsername("warehouse")).thenReturn(user("warehouse", User.Role.WAREHOUSE_MANAGER));
        String token = jwtService.generateToken("warehouse", "WAREHOUSE_MANAGER");

        Authentication auth = run(bearer(token));

        assertThat(auth).isNotNull();
        assertThat(auth.getName()).isEqualTo("warehouse");
        assertThat(authorities(auth)).containsExactly("ROLE_WAREHOUSE_MANAGER");
    }

    @Test
    @DisplayName("the access_token cookie authenticates the user")
    void cookieTokenAuthenticates() throws Exception {
        when(users.loadUserByUsername("staff")).thenReturn(user("staff", User.Role.STAFF));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
        request.setCookies(new Cookie(AuthService.ACCESS_COOKIE, jwtService.generateToken("staff", "STAFF")));

        Authentication auth = run(request);

        assertThat(auth).isNotNull();
        assertThat(auth.getName()).isEqualTo("staff");
    }

    @Test
    @DisplayName("the role comes from the database: a demoted user keeps no old privileges")
    void roleIsTakenFromTheDatabaseNotTheToken() throws Exception {
        String tokenIssuedWhileAdmin = jwtService.generateToken("ex.admin", "ADMIN");
        when(users.loadUserByUsername("ex.admin")).thenReturn(user("ex.admin", User.Role.STAFF));

        Authentication auth = run(bearer(tokenIssuedWhileAdmin));

        assertThat(authorities(auth)).containsExactly("ROLE_STAFF");
    }

    @Test
    @DisplayName("no token: the request stays anonymous")
    void noTokenStaysAnonymous() throws Exception {
        assertThat(run(new MockHttpServletRequest("GET", "/api/products"))).isNull();
    }

    @Test
    @DisplayName("a garbage token is ignored")
    void garbageTokenIsIgnored() throws Exception {
        assertThat(run(bearer("abc"))).isNull();
        assertThat(run(bearer("eyJhbGciOiJIUzI1NiJ9.e30.invalid"))).isNull();
    }

    @Test
    @DisplayName("an expired token is ignored")
    void expiredTokenIsIgnored() throws Exception {
        String expired = Jwts.builder()
                .subject("staff")
                .claim("role", "STAFF")
                .expiration(new Date(System.currentTimeMillis() - 60_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes()))
                .compact();

        assertThat(run(bearer(expired))).isNull();
    }

    @Test
    @DisplayName("a token signed with another key is ignored")
    void forgedTokenIsIgnored() throws Exception {
        String forged = Jwts.builder()
                .subject("admin")
                .claim("role", "ADMIN")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor("another-secret-key-that-the-server-does-not-know-1234".getBytes()))
                .compact();

        assertThat(run(bearer(forged))).isNull();
    }

    @Test
    @DisplayName("a valid token of a deleted user is ignored")
    void tokenOfDeletedUserIsIgnored() throws Exception {
        when(users.loadUserByUsername("gone")).thenThrow(new UsernameNotFoundException("gone"));

        assertThat(run(bearer(jwtService.generateToken("gone", "STAFF")))).isNull();
    }
}
