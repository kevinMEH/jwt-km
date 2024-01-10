import test from "node:test";
import assert from "node:assert";

import JWT, { unixTime } from "./jwt.js";

test("Simple claim tests", () => {
    const jwt = new JWT("liao.gg", unixTime() + 60 * 60);
    jwt.addClaim("claim1", 123);
    jwt.addClaim("claim2", "asdf")
        .addClaim("claim3", false);
    assert(jwt.getClaim("claim1") === 123);
    assert(jwt.getClaim("claim2") === "asdf");
    assert(jwt.getClaim("claim3") === false); 
});

test("Successful token generation", () => {
    const jwt = new JWT("liao.gg", unixTime() + 60 * 60, unixTime());
    jwt.addClaim("someClaim", "hello");
    assert(typeof jwt.getToken("AAAAAAAAAAAAAAAA") === "string");
});

test("Verifies JWT is correct", () => {
    const jwt = new JWT("liao.gg", 1700000000, 1600000000);
    jwt.addClaim("username", "kevin");
    jwt.addClaim("nonce", 322);
    const token = jwt.getToken("ABC123"); // Secret in base64url: q8Ej
    // JWT from external source generated from jwt.io
    assert(token === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJsaWFvLmdnIiwiZXhwIjoxNzAwMDAwMDAwLCJpYXQiOjE2MDAwMDAwMDAsInVzZXJuYW1lIjoia2V2aW4iLCJub25jZSI6MzIyfQ.QNwo4PrdANI_TiYmOPinENL_ZRPwH3D2Um3DlfPNDWE");
});

test("JWT.verify() tests", () => {
    const validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJsaWFvLmdnIiwiZXhwIjoxNzAwMDAwMDAwLCJpYXQiOjE2MDAwMDAwMDAsInVzZXJuYW1lIjoia2V2aW4iLCJub25jZSI6MzIyfQ.QNwo4PrdANI_TiYmOPinENL_ZRPwH3D2Um3DlfPNDWE";
    const validSecret = "ABC123";
    assert(JWT.verify(validToken, validSecret));
    assert(JWT.verify(validToken + "1", validSecret) === false);
    assert(JWT.verify(validToken, validSecret + "11") === false);
    assert(JWT.verify(validToken + "1", validSecret + "11") === false);
    assert(JWT.verify(validToken + "a", validSecret) === false);
    assert(JWT.verify(validToken, validSecret + "ab") === false);
    assert(JWT.verify(validToken + "a", validSecret + "ab") === false);
    assert(JWT.verify(validToken.substring(1), validSecret) === false);
    assert(JWT.verify(validToken, validSecret.substring(2)) === false);
    assert(JWT.verify("", validSecret) === false);
});

test("JWT.unwrap() tests", () => {
    const secret = "ABCDEF";

    const jwt = new JWT("liao.gg", 9999);
    jwt.addClaim("username", "kevin");
    const token = jwt.getToken(secret);
    
    assert(JWT.unwrap(token.substring(1), secret) === null);
    assert(JWT.unwrap(token, secret + "1b") === null);
    assert(JWT.unwrap(token + "1", secret + "1bba") === null);
    
    const unwrapped = JWT.unwrap(token, secret);
    assert(unwrapped !== null);
    const [ _header, payload ] = unwrapped;
    assert(payload.iss === "liao.gg");
    assert(payload.exp === 9999);
    assert(payload.username === "kevin");
    assert(payload.nonexist === undefined);
});

test("JWT.fromToken() tests", () => {
    const secret = "0123456789";
    
    const jwt = new JWT("liao.gg", 3600);
    jwt.addClaim("claim", 123);
    const token = jwt.getToken(secret);

    assert(JWT.fromToken(token.substring(1), secret) === null);
    assert(JWT.fromToken(token, secret.substring(2)) === null);
    assert(JWT.fromToken(token.substring(1), secret.substring(2)) === null);
    assert(JWT.fromToken(token, "1") === null);
    assert(JWT.fromToken("", secret) === null);
    
    const recovered = JWT.fromToken(token, secret);
    assert(recovered !== null);
    assert(recovered.getClaim("iss") === "liao.gg");
    assert(recovered.getClaim("exp") === 3600);
    assert(recovered.getClaim("claim") === 123);
    assert(recovered.getToken(secret) === token);
});

test("JWT.expired() tests", () => {
    const secret = "1233344";
    
    const expired = new JWT("liao.gg", unixTime() - 60 * 60); // Expired 1 hour ago
    expired.addClaim("someClaim", true);
    const expiredToken = expired.getToken(secret);

    assert(JWT.expired(expiredToken, secret));
    
    const malformed = new JWT("liao.gg");
    malformed.addClaim("exp", "asdfasdfasdf");
    const malformedToken = malformed.getToken(secret);
    
    assert(JWT.expired(malformedToken, secret));
    
    const valid = new JWT("liao.gg", unixTime() + 24 * 60 * 60); // Expires in 1 day
    valid.addClaim("someClaim", true);
    const validToken = valid.getToken(secret);
    
    // Invalid tokens are considered to be expired
    assert(JWT.expired(validToken.substring(1), secret));
    assert(JWT.expired(validToken, secret.substring(2)));
    assert(JWT.expired(validToken + "1", secret));
    assert(JWT.expired(validToken, "12312"));
    
    assert(JWT.expired(validToken, secret) === false);
});

test("Bad secret gives error", () => {
    const jwt = new JWT("liao.gg", unixTime() + 60 * 60);

    try {
        const token = (jwt.getToken as any)();
        assert(false, "Getting token with no secret should've thrown an error.");
    } catch(error) { }
    try {
        const token = jwt.getToken("xyz");
        assert(false, "Getting token with non hex secret should've thrown an error.");
    } catch(error) { }
    try {
        const token = jwt.getToken("123zabc");
        assert(false, "Getting token with non hex secret should've thrown an error.");
    } catch(error) { }
    try {
        const token = jwt.getToken("123?!abc");
        assert(false, "Getting token with non hex secret should've thrown an error.");
    } catch(error) { }
    try {
        const token = jwt.getToken("123?!abc");
        assert(false, "Getting token with non hex secret should've thrown an error.");
    } catch(error) { }
    
    const token = jwt.getToken("123aBcDeF0");

    try {
        (JWT.unwrap as any)(token);
        assert(false, "Unwrapping token with no secret should've thrown an error.");
    } catch(error) { }
    try {
        JWT.unwrap(token, "abcz");
        assert(false, "Unwrapping token with non hex secret should've thrown an error.");
    } catch(error) { }
    
    try {
        (JWT.fromToken as any)(token);
        assert(false, "Getting JWT from token with no secret should've thrown an error.");
    } catch(error) { }
    try {
        JWT.fromToken(token, "abc!");
        assert(false, "Getting JWT from token with non hex secret should've thrown an error.");
    } catch(error) { }
    
    try {
        (JWT.expired as any)(token);
        assert(false, "Checking if token is expired with no secret should've thrown an error.");
    } catch(error) { }
    try {
        JWT.expired(token, "a~");
        assert(false, "Checking if token is expired with non hex secret should've thrown an error.");
    } catch(error) { }
});