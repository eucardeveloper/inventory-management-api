package com.enesucar.inventory.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClientIpResolverTest {

    private static MockHttpServletRequest request(String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    @Test
    void byDefaultTheForwardedHeaderIsIgnoredBecauseAClientCanForgeIt() {
        ClientIpResolver resolver = new ClientIpResolver(false);

        assertEquals("203.0.113.7", resolver.resolve(request("203.0.113.7", "6.6.6.6")));
    }

    @Test
    void behindATrustedProxyTheLastEntryIsUsedNotTheFirst() {
        ClientIpResolver resolver = new ClientIpResolver(true);

        // The caller sent "6.6.6.6"; the trusted proxy appended the address it actually saw.
        assertEquals("198.51.100.20", resolver.resolve(request("10.0.0.2", "6.6.6.6, 198.51.100.20")));
    }

    @Test
    void trustedModeFallsBackToThePeerWhenThereIsNoHeader() {
        ClientIpResolver resolver = new ClientIpResolver(true);

        assertEquals("10.0.0.2", resolver.resolve(request("10.0.0.2", null)));
    }

    @Test
    void trustedModeIgnoresABlankHeader() {
        ClientIpResolver resolver = new ClientIpResolver(true);

        assertEquals("10.0.0.2", resolver.resolve(request("10.0.0.2", "  ,  ")));
    }
}
