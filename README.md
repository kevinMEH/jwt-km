# jwt-km

jwt-km is a simple and intuitive JSON Web Token (JWT) package for NodeJS.

To install jwt-km, run the following command:
```
npm install jwt-km
```

## Features
- Single file implementation
  - The entire package is implemented inside a single 200 line file, `jwt.ts`.
- Zero external dependencies
  - jwt-km does not attempt to hide complexity inside external dependencies.
  - The only dependency is Node's `crypto` module.
- Zero bloat, zero outdated code, zero useless code
  - jwt-km strips away all the useless fluff present in every other package
  - jwt-km implements JWTs in a simple and modern fashion
  - jwt-km is very, very, very fast
- Extremely easy to use
  - Simple and modern implementation
    - Everything is encapsulated in the `JWT` class.
    - There is only 7 methods to remember
  - Zero error handling
    - The only error is for an invalid secret key.
    - Once the secret key is correctly setup, all the error handling is built into the methods.
  - Fully synchronous
    - No working with Promises or callbacks.
  - ESM support (`import`, `export`, etc.)
    - Stop using outdated packages written for CommonJS
    - Stop using garbage packages with documentation that still uses `var`
  - Full TypeScript support
- Detailed documentation with examples

## Usage

The jwt-km package is structured around the `JWT` class, which represents a single JSON Web Token.

Along with some other exported objects, a helper function `unixTime()` is provided, which calculates the current unix timestamp using `Date.now()`.

```javascript
import JWT from "jwt-km";
import { unixTime } from "jwt-km";
```

Note: In the section below, `liao.gg` refers to the issuer's name or domain, which in this case is me. When using the package in your own project, please use your own domain name or some other identifier.

---

To create a token, create a new instance of the `JWT` class: It is strongly recommended that you provide the issuer and expiration timestamp parameter in the constructor.

```javascript
// Supply the issuer (iss) and token expiration timestamp (exp)
const jwt = new JWT("liao.gg", unixTime() + 60 * 60); // Expires in 1 hour, or 60 * 60 seconds

// Optionally, you can create an empty token by providing no arguments. (Not recommended)
const emptyJwt = new JWT();
```

---

To add claims, use the `.addClaim()` method:
```javascript
emptyJwt.addClaim("iss", "liao.gg");
emptyJwt.addClaim("exp", unixTime() + 60 * 60);

// You can also chain together .addClaim() calls
const alsoJwt = new JWT("liao.gg", unixTime() + 60 * 60)
    .addClaim("username", "kevin")
    .addClaim("permissions", "admin");
```

---

To get the value of a claim, use the `getClaim()` method:
```javascript
assert(alsoJwt.getClaim("username") === "kevin");
assert(alsoJwt.getClaim("nonexistant") === undefined);
```

---

Finally, to generate the token in string form, use the `getToken()` method along with a secret key:
```javascript
// In this example, we will hardcode the secret
const secret = "DD4E8D770CF2CCDBEC698D005D049DB432805D223F8441B709746EB33A8F8711";

const jwt = new JWT("liao.gg", unixTime() + 60 * 60);
jwt.addClaim("username", "kevin");
const token = jwt.getToken(secret);
// token === eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
//          .eyJpc3MiOiJsaWFvLmdnIiwiZXhwIjoxNzA0NzY0Mzc2LCJpYXQiOjE3MDQ3NjA3NzYsInVzZXJuYW1lIjoia2V2aW4ifQ
//          .Wvxdsp-ftlv9R97BELDBwwVN0H7rbN8P1JH9dBVzES8
```

The token will be in base64url form.

Note: Please read the next section for more information on the algorithm used to generate the signature, the format of the secret key, and best practices.

---

To get a new JWT object back from the token, use the `JWT.fromToken()` static method:
```javascript
const secret = "DD4E8D770CF2CCDBEC698D005D049DB432805D223F8441B709746EB33A8F8711";

const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJpc3MiOiJsaWFvLmdnIiwiZXhwIjoxNzA0NzY0Mzc2LCJpYXQiOjE3MDQ3NjA3NzYsInVzZXJuYW1lIjoia2V2aW4ifQ
.Wvxdsp-ftlv9R97BELDBwwVN0H7rbN8P1JH9dBVzES8`.split("\n").join(""); // Token from above

const jwt = JWT.fromToken(token, secret);
assert(jwt !== null);
assert(jwt.getClaim("username") === "kevin");

const newToken = jwt.addClaim("username", "admin").getToken(secret);
```

---

To get the Header and Payload object back from a token, use the `JWT.unwrap()` static method:
```javascript
const secret = "DD4E8D770CF2CCDBEC698D005D049DB432805D223F8441B709746EB33A8F8711";

const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJpc3MiOiJsaWFvLmdnIiwiZXhwIjoxNzA0NzY0Mzc2LCJpYXQiOjE3MDQ3NjA3NzYsInVzZXJuYW1lIjoia2V2aW4ifQ
.Wvxdsp-ftlv9R97BELDBwwVN0H7rbN8P1JH9dBVzES8`.split("\n").join(""); // Token from above

const unwrapped = JWT.unwrap(token, secret);
assert(unwrapped !== null);
const [ header, payload ] = unwrapped;
assert(payload.username === "kevin");
assert(payload.nonexistant === undefined);

// If the token is malformed or is not consistent with the secret, null will be returned
const badTokenUnwrapped = JWT.unwrap(token.substring(1), secret);
assert(badTokenUnwrapped === null);

const badSecretUnwrapped = JWT.unwrap(token, secret.split("").reverse().join(""));
assert(badSecretUnwrapped === null);
```

Note: It is recommended that you just use the `JWT.fromToken()` method instead.

---

To quickly check if a token is expired, use the `JWT.expired()` static method:
```javascript
const secret = "DD4E8D770CF2CCDBEC698D005D049DB432805D223F8441B709746EB33A8F8711";

const expiredJwt = new JWT("liao.gg", unixTime() - 60); // Expired a minute ago
const expiredToken = expiredJwt.getToken(secret);
assert(JWT.expired(expiredToken, secret));

const unexpiredJwt = new JWT("liao.gg", unixTime() + 7 * 24 * 60 * 60); // Expires in 1 week
const unexpiredToken = unexpiredJwt.getToken(secret);
assert(JWT.expired(unexpiredToken, secret) === false);

// If the token fails to verify, or the "exp" field is invalid, the token will be considered expired.
assert(JWT.expired(unexpiredToken.substring(1), secret));
```

---

To quickly check if a token is valid, (consistent with your secret), use the `JWT.verify()` static method:
```javascript
const secret = "DD4E8D770CF2CCDBEC698D005D049DB432805D223F8441B709746EB33A8F8711";

const issuedByUs = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJpc3MiOiJsaWFvLmdnIiwiZXhwIjoxNzA0NzY0Mzc2LCJpYXQiOjE3MDQ3NjA3NzYsInVzZXJuYW1lIjoia2V2aW4ifQ
.Wvxdsp-ftlv9R97BELDBwwVN0H7rbN8P1JH9dBVzES8`.split("\n").join(""); // Token from above
assert(JWT.verify(issuedByUs, secret));

const notIssuedByUs = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJpc3MiOiJsaWFvLmdnIiwiZXhwIjoxNzA0NzY2NjgzLCJpYXQiOjE3MDQ3NjMwODMsInVzZXJuYW1lIjoia2V2aW4ifQ
.sK59XyXA6iyvGiPUEokAQMqh0joa82fA_j20iFdOwX4`.split("\n").join(""); // Signed with different secret
assert(JWT.verify(notIssuedByUs, secret) === false);
```

Note: In most cases, you won't need to use this, as `JWT.fromToken()`, `JWT.unwrap()`, and `JWT.expired()` all call `JWT.verify()` internally anyways.

## Token Signature

### Algorithm

jwt-km uses the HS256 algorithm to create the signature for the token. This is the default, and it is the only algorithm which is supported as of right now. However, for all intents and purposes, HS256 is secure enough for virtually every use case as long as your key is secure enough.

If you really feel the need to use another signature generation algorithm, feel free to contribute to the project by opening a pull request (more information below), or to simply copy and paste the `jwt.js` or `jwt.ts` file and modify it for use in your own project.

### Secret Key

The secret key should be in the form of a hex string representing at least 256 bits. This means that the hex string which you provide should be at least 64 hexes long.

```javascript
const goodSecret = `0D9C1749A81DC9B132CE922A2F6CA6F6C873EB65BFF127004468F50E5090429B`;
```

The *maximum* length of the secret key is 512 bits, or 128 hexes long.

In actuality, you can provide a secret longer than this, but because the maximum key size for the HS256 algorithm is 512 bits, any key that is longer will be hashed and its hash will be used instead. Since we are using HS256, this actually results in a less secure key being used, as the hashed output of the key will be 256 bits, or only 64 hexes long.

```javascript
const maximallySecureSecret     = `0B667742CC78EFFCEB2050131334EEF9A9442603998BF744B62F1C3665EDBE31F7FF052FF64AAFCCD552CCDA25885567646DFE7220BBC15EE937122089825739`;
const longerButLessSecureSecret = `02AA059373520AB46F1BADBE47D5183264FBD923A45952FDDDBE682983A1A88E61997E30F51C9A0ABB050E5D1FC65F4611631C15F872057CD6425B6BCE4DD9B56`;
```

To generate a secret key, run the snippet below as a script file, in **AN EMPTY TAB** in your browser's console, or in the Node REPL:
```javascript
const keyset = "1234567890ABCDEF".split("");
const keyLength = 64; // Replace with higher number if so desired, up to 128.
let secret = "";
for(let i = 0; i < keyLength; i++) {
    secret += keyset[Math.floor(Math.random() * 16)];
}
console.log(secret);
```

**DO NOT** use any website or any program which you do not know the source code of to generate your secret key.

---

It is not recommended that you hard code your secret key into your project files. Instead, use a `.env` file and store the secret there:
```
# Inside file .env
SECRET=69BAD09D17B2BA0E8FB5A6B93965F35ED381EC9663F94A1F853A5ACEBE6B75AB
```

```javascript
// Inside project files
const secret = process.env.SECRET || (() => { throw new Error("No secret provided.") })();
```

Note: If possible, we recommend using the `--env-file=.env` option native to Node to load env files in NodeJS v20 and above.

## Contributing

Before contributing, please consider if your proposed change / addition aligns with jwt-km's principle of simplicity, minimalism, and ease of use. If you're not sure, open a ticket to discuss your idea with us.

To contribute, fork this repository, make your changes, and open a pull request when you're ready. We welcome all relevant changes and strive to provide the best experience for our users.

### Project Structure

`jwt.ts` - The file implementing the `JWT` class

`test.ts` - Relevant unit tests

## Learn More

[JSON Web Tokens on Wikipedia](https://en.wikipedia.org/wiki/JSON_Web_Token)
