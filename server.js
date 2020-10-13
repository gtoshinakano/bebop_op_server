var bebop = require('node-bebop');
var io = require('socket.io')(7575)
var jsoncolor = require('json-colorizer');

io.on('connect', socket => {
  console.log('Client connected to Socket.io');
  socket.emit("ping", "pong");
  socket.emit("drone_connected", false)
  socket.emit("drone_can_mission", false)

  /* For testing purposes
  socket.emit("gps_ready", true)
  socket.emit("gps_position_changed", {latitude: 43.024656, longitude: 141.344694})
  socket.emit("gps_ready",false)
  //*/

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

    drone.on("GPSFixStateChanged", (data) => socket.emit("flight_status", "GPS Fix State changed : " + JSON.stringify(data)))

    drone.on("MagnetoCalibrationRequiredState", (data) => socket.emit("flight_status", "Calibration Required : " + JSON.stringify(data)))

    drone.on("MaxAltitudeChanged", (data) => socket.emit("flight_status", "Max Altitude changed : " + JSON.stringify(data)))

    drone.on("MaxDistanceChanged", (data) => socket.emit("flight_status", "Max Distance changed : " + JSON.stringify(data)))

    drone.on("OutdoorChanged", (data) => socket.emit("flight_status", "Outdoor changed : " + JSON.stringify(data)))

    drone.on("HomeChanged", (data) => socket.emit("flight_status", "Home changed : " + JSON.stringify(data)))

    /* If number is different emit signal to the
      client with the new number of satellites found
    */
    let numOfSat = 0;

    drone.on("NumberOfSatelliteChanged", (data) => {
      console.log("Num of sat changed", data.numberOfSatellite);
      if(data.numberOfSatellite != numOfSat){
        numOfSat= data.numberOfSatellite;
        socket.emit("flight_status", "Number of Satellites : " + numOfSat)
        if(numOfSat > 0) socket.emit("gps_ready", true)
      }
    })

    /* Prepare drone to get GPS Data
      1- Reset home and set Outdoor 1
      2- Listen for PositionChanged and send to client
    */
    drone.GPSSettings.resetHome()
    drone.WifiSettings.outdoorSetting(1)
    drone.on("PositionChanged", (data) => {
      console.log(data);
      if(data.latitude != 500 && data.longitude != 500 && data.altitude != 500)
        socket.emit("gps_position_changed", data)
    })

    /* This is for testing purposes
    drone.takeOff()
    setTimeout(() => drone.land() , 7000)
    //*/

    drone.on("MavlinkPlayErrorStateChanged", function(data) {
      socket.emit("flight_status", "MavlinkPlayErrorStateChanged : " + JSON.stringify(data))
    });

    drone.on("MavlinkFilePlayingStateChanged", function(data) {
      socket.emit("flight_status", "MavlinkFilePlayingStateChanged : " + JSON.stringify(data))
    });

    var canDoMission = false
    drone.on("AvailabilityStateChanged", function(data) {
      console.log("AvailabilityStateChanged", data);
      socket.emit("flight_status", "AvailabilityStateChanged : " + JSON.stringify(data))
      if (data.AvailabilityState === 1) {
        canDoMission = true;
        socket.emit("drone_can_mission", true)
      }else{
        canDoMission = false;
        socket.emit("drone_can_mission", false)
      }
    });

    socket.on("start_mission" , function(data) {
      drone.Mavlink.start("/data/ftp/internal_000/flightplans/flightPlan.mavlink", 0);
    })

    drone.on("ComponentStateListChanged", function(data) {
      console.log("ComponentStateListChanged", data);
    });



  })

  socket.on('disconnect', () => {
    console.log(jsoncolor({text: 'Client diconnected from Socket.io'}));
  })
});
