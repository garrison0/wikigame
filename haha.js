// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset="utf-8" />
// </head>
// <body>

// <title>wikigame</title>

// <style>
//     * { padding: 0; margin: 0; }
//     canvas { background:#eee; display: block; margin: 0 auto; }
// </style>

//  <link rel="stylesheet" href="node_modules/xterm/dist/xterm.css" />
// <script src="node_modules/xterm/dist/xterm.js"></script>

// <p align="center">
// <canvas id="myCanvas" width="960" height="640"></canvas>
// <p align="center">
// <div id="terminal" width="960" height="640"></div>
// <script src="bundle.js"></script>
// <script>
//         var term = new Terminal();
//         term.open(document.getElementById('terminal'));
//         term.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')
//         function runFakeTerminal() 
//         {
//             if (term._initialized) {
//                 return;
//             }

//             term._initialized = true;

//             term.prompt = () => {
//                 term.write('\r\n$ ');
//             };

//             term.writeln('Welcome to xterm.js');
//             term.writeln('This is a local terminal emulation, without a real terminal in the back-end.');
//             term.writeln('Type some keys and commands to play around.');
//             term.writeln('');
//             term.prompt();

//             term.on('key', function(key, ev) {
//                 const printable = !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey;

//                 if (ev.keyCode === 13) {
//                     term.prompt();
//                 } else if (ev.keyCode === 8) {
//                     // Do not delete the prompt
//                     if (term._core.buffer.x > 2) {
//                         term.write('\b \b');
//                     }
//                 } else if (printable) {
//                     term.write(key);
//                 }
//             });

//             term.on('paste', function(data) {
//                 term.write(data);
//             });
//         }
//         runFakeTerminal();
// </script>
// </body>
// </html>