@ECHO OFF
IF "%1%"=="dev" (
    node .\node_modules\webpack-dev-server\bin\webpack-dev-server --config webpack-dev-server.config.js --hot --progress --colors --port 4002 --open --content-base .
) ELSE IF "%1%" == "build-example" (
    node .\node_modules\webpack\bin\webpack --config webpack-examples.config.js
    node ./examples/generate.js
) ELSE (
    rmdir /s /q .\build
    node .\node_modules\babel-cli\bin\babel --stage 0 --out-dir .\build .\lib
    node .\node_modules\webpack\bin\webpack
)
