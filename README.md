# Technitium DNS Web

Technitium DNS Web - Simple and minimal Web App for Watch Query Logs, Flush cache and Control Adblocker.  

> Simple and Minimal Responsive Web app for: **<https://github.com/TechnitiumSoftware/DnsServer>**

## Setup

- Technitium DNS Server API - By default it's not CORS enabled you have to use Reverse proxy for add CORS headers and use the API on Web Apps
- I prefer Caddy for this

```sh
{
	email youremail@example.com

	servers {
		protocols h1 h2 h3
	}
}

dns.example.com {
	tls {
		protocols tls1.2 tls1.3
		curves x25519 secp256r1
	}

	# ✅ ONLY allow /api
	handle /api/* {
		# ✅ Preflight
		@preflight {
			method OPTIONS
		}

		handle @preflight {
			header {
				Access-Control-Allow-Origin "*"
				Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
				Access-Control-Allow-Headers "Content-Type, Authorization"
				Access-Control-Max-Age "86400"

				Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
				Pragma "no-cache"
				Expires "0"

				-Server
			}
			respond 204
		}

		# 🔁 Reverse proxy
		reverse_proxy 127.0.0.1:5380 {
			header_up Host {host}
			header_up X-Real-IP {remote_host}
			header_down -Server
			header_down -X-Powered-By
		}

		# 🛡️ Headers
		header {
			Access-Control-Allow-Origin "*"
			Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
			Access-Control-Allow-Headers "Content-Type, Authorization"

			Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"

			Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
			Pragma "no-cache"
			Expires "0"

			X-Robots-Tag "noindex, nofollow"

			X-Content-Type-Options "nosniff"
			X-Frame-Options "DENY"
			Referrer-Policy "no-referrer"
			Permissions-Policy "geolocation=(), microphone=(), camera=()"

			-X-XSS-Protection
			-Server
		}
	}

	# 🚫 Block everything else
	handle {
		header -Server
		respond "Forbidden" 403
	}
}
```
- Setup caddy server only for `https://dns.example.com/api/` keep other routes and path blocked via domain
- offical Docs: **<https://blog.technitium.com/2022/06/how-to-self-host-your-own-domain-name.html>**

> ***Live Site:*** **<https://tdnsweb.pages.dev/>**  

## LICENSE

MIT
