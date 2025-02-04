DEBUG=

# Tell make to ignore existing folders and allow overwriting existing files
.PHONY: modules literal

# Must format with tabs not spaces
literal:
	deno run --allow-read --allow-env --allow-net --allow-write --allow-run ../literal/deno/make-literal.js ./ debug

modules:
	rm -rf ./build
	deno run --allow-read --allow-env --allow-net --allow-write --allow-run ./deno/make-modules.js ./build ./modules/stream.js ./documentation.css
