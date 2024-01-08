import { createHmac } from "crypto";

export type Header = {
    alg: string,
    typ: string
};

export type Payload = {
    iss?: string,
    exp?: number,
    iat?: number,
    [key: string]: any
};

export const defaultHeader: Header = {
    alg: "HS256",
    typ: "JWT"
};

class JWT {
    header: Header;
    payload: Payload;
    
    /**
     * Create a new JWT with optionally an issuer (iat), expiration unix
     * timestamp (exp), and the issuing unix timestamp (iat).
     * 
     * It is recommended that the issuer and the expiration timestamp is provided.
     * If the issuing timestamp is not provided, but the issuer and expiration
     * is provided, then it is automatically set to the current time.
     * 
     * @param issuer 
     * @param expiration 
     * @param issuedAt 
     */
    constructor(issuer?: string, expiration?: number, issuedAt?: number) {
        this.header = {
            alg: "HS256",
            typ: "JWT"
        };
        this.payload = Object.create(null);
        if(issuer !== undefined) {
            this.payload.iss = issuer;
        }
        if(expiration !== undefined) {
            this.payload.exp = expiration;
        }
        if(issuer !== undefined && expiration !== undefined) {
            this.payload.iat = issuedAt || unixTime();
        }
    }
    
    /**
     * Adds any claim to the JWT's payload.
     * 
     * @param claimName 
     * @param value 
     * @returns 
     */
    addClaim(claimName: string, value: any) {
        this.payload[claimName] = value;
        return this;
    }
    
    getClaim(claimName: string): any | undefined {
        return this.payload[claimName];
    }
    
    getToken(secret: string): string {
        if(!(/^[a-fA-F0-9]+$/.test(secret))) {
            throw new Error("Secret must be a hex string. (No 0x)");
        }
        const body = objectToBase64(this.header) + "." + objectToBase64(this.payload);
        const hmac = createHmac("sha256", Buffer.from(secret, "hex"));
        hmac.update(body);
        const signature = hmac.digest("base64url");
        return body + "." + signature;
    }
    
    /**
     * Given a token and a secret, checks if the token is consistent.
     * 
     * Returns true / false if the JWT is verified or not.
     * Returns false if the JWT format is invalid (not 3 parts separated by dots).
     * 
     * @param token 
     * @param secret The secret in the form of a compact hex string.
     * @returns 
     */
    static verify(token: string, secret: string): boolean {
        if(!/^[a-fA-F0-9]+$/.test(secret)) {
            throw new Error("Secret must be a hex string. (No 0x)");
        }
        const parts: string[] = token.split(".");
        if(parts.length !== 3) {
            return false;
        }
        const body = parts[0] + "." + parts[1];
        const hmac = createHmac("sha256", Buffer.from(secret, "hex"));
        hmac.update(body);
        const signature = hmac.digest("base64url");
        return signature === parts[2];
    }
    
    /**
     * Given a valid token, unwraps the token and returns the Header and Payload
     * object.
     * 
     * If the token is invalid, null is returned.
     * 
     * Notes:
     * Header and payload structure will not be verified.
     * Expirations will not be checked.
     * 
     * @param token 
     * @param secret Must be hex string
     * @returns [Header, Payload] | null
     */
    static unwrap(token: string, secret: string): [Header, Payload] | null {
        if(!JWT.verify(token, secret)) {
            return null;
        }
        const parts = token.split(".");
        // After verification, we can guarantee that the token was indeed issued
        // by us. Thus, we can guarantee that the token represents a valid JSON
        // string, and can be parsed into an object.
        return [ objectFromBase64(parts[0]) as Header, objectFromBase64(parts[1]) as Payload ];
    }
    
    /**
     * Given a valid token, returns a new JWT object based on the token.
     * 
     * If the token is invalid, null is returned.
     * 
     * The claims on the payload of the JWT object will be identical to that on
     * the token. Header properties will not be copied over; the default header
     * properties will be used.
     * 
     * @param token 
     * @param secret 
     * @returns 
     */
    static fromToken(token: string, secret: string): JWT | null {
        if(!JWT.verify(token, secret)) {
            return null;
        }
        const parts = token.split(".");
        let payload = objectFromBase64(parts[1]) as Payload;
        const result = new JWT();
        for(const property in payload) {
            result.addClaim(property, payload[property])
        }
        return result;
    }
    
    /**
     * Checks if a token is expired.
     * 
     * If the token is invalid or it does not have an "exp" field, it is
     * considered to be expired.
     * 
     * @param token 
     * @param secret 
     * @returns 
     */
    static expired(token: string, secret: string): boolean {
        if(!JWT.verify(token, secret)) {
            return true;
        }
        const parts = token.split(".");
        const header = objectFromBase64(parts[1]) as Payload;
        if(header.exp === undefined) {
            return true;
        }
        return unixTime() < header.exp;
    }
}

/**
 * Turns an object into a JSON string and convert into base64url format.
 * 
 * @param object 
 * @returns 
 */
function objectToBase64(object: object) {
    return Buffer.from(JSON.stringify(object)).toString("base64url");
}

/**
 * ATTENTION: Make sure that the supplied string is a valid JSON string encoded
 * in base64url, or else an error will be returned.
 * 
 * @param string 
 * @returns 
 */
function objectFromBase64(string: string): object {
    return JSON.parse(Buffer.from(string, "base64url").toString());
}

/**
 * Get the unix time in seconds.
 * 
 * @returns 
 */
export function unixTime() {
    return Math.floor(Date.now() / 1000);
};

export default JWT;