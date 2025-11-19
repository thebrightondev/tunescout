import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import { parse } from "node:url";
import next from "next";

const appHostname = process.env.NEXT_HOSTNAME ?? "tunescout.local.com";
const listenHostname = process.env.LISTEN_HOSTNAME ?? "0.0.0.0";
const port = Number.parseInt( process.env.PORT ?? "3000", 10 );
const sslKeyPath = process.env.SSL_KEY_PATH ?? ".certs/tunescout-local.com-key.pem";
const sslCertPath = process.env.SSL_CERT_PATH ?? ".certs/tunescout-local.com.pem";

const dev = process.env.NODE_ENV !== "production";

const app = next( { dev, hostname: appHostname, port } );
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync( sslKeyPath ),
  cert: readFileSync( sslCertPath ),
};

app.prepare().then( () => {
  createServer( httpsOptions, ( req, res ) => {
    const parsedUrl = parse( req.url ?? "", true );
    handle( req, res, parsedUrl );
  } ).listen( port, listenHostname, () => {
    console.log( `> Ready on https://${appHostname}:${port} (listening on ${listenHostname})` );
  } );
} ).catch( ( error ) => {
  console.error( "Failed to start HTTPS Next.js server", error );
  process.exit( 1 );
} );
