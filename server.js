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
      socket.emit("flight_status", "Drone is ready")
      console.log(drone.navData);
    })


    // Send battery level
    drone.on("battery", (data) => socket.emit("battery_level", data))

    // Send landed
    drone.on("landed", () => socket.emit("flight_status", "Drone is on the ground"))

    // Send hovering
    drone.on("hovering", () => socket.emit("flight_status", "Drone is hovering"))

    // Send landing
    drone.on("landing", () => socket.emit("flight_status", "Drone is landing"))

    // Send flying
    drone.on("flying", () => socket.emit("flight_status", "Drone is flying"))

    // Send takingOff
    drone.on("takingOff", () => socket.emit("flight_status", "Drone is taking off"))

    // Send emergency
    drone.on("emergency", () => socket.emit("flight_status", "Drone encountered an emergency condition"))

    drone.on("GPSFixStateChanged", (data) => socket.emit("flight_status", "GPSFixStateChanged : " + JSON.stringify(data)))

    /* This is for testing purposes
    drone.takeOff()
    setTimeout(() => drone.land() , 7000)
    //*/

  })

  socket.on('disconnect', () => {
    console.log(jsoncolor({text: 'Client diconnected from Socket.io'}));
  })
});
