var bebop = require('node-bebop');
var io = require('socket.io')(7575)
var jsoncolor = require('json-colorizer');

io.on('connect', socket => {
  console.log('Client connected to Socket.io');
  socket.emit("ping", "pong");
  socket.emit("drone_connected", false)

  //Init drone
  var drone = bebop.createClient();

  drone.connect(function() {
    console.log("Bebop is ready to fly!");
    drone.on("ready", () => {
      socket.emit("drone_connected", true)
      console.log(drone.navData);
    })

    drone.on("battery", (data) => socket.emit("battery_level", data))



  })

  socket.on('disconnect', () => {
    console.log(jsoncolor({text: 'Client diconnected from Socket.io'}));
  })
});
