var bebop = require('node-bebop');
var io = require('socket.io')(7575)
var jsoncolor = require('json-colorizer');

io.on('connect', socket => {
  console.log('Client connected to Socket.io');
  socket.emit("ping", "pong");

  socket.on('disconnect', () => {
    console.log(jsoncolor({text: 'Client diconnected from Socket.io'}));
  })
});


//var drone = bebop.createClient();

/* drone.connect(function() {
  console.log("Conectei e vou subir");
  drone.takeOff();

  setTimeout(function() {
    console.log("To descendo mulek");
    drone.land();
  }, 5000);
});
*/
