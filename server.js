var bebop = require('node-bebop');
var io = require('socket.io')(7575)
var jsoncolor = require('json-colorizer');
var log = require('log-to-file');
var fs = require("fs");

const logTime = new Date();
const logFile = "logs/"+logTime.getTime()+".log";
const gpsLogFile = "gps_logs/"+logTime.getTime()+"_gps.log";
fs.writeFileSync(logFile, "Log Created at " + logTime+"\n", () => console.log("Log File Created "+ logFile))
fs.writeFileSync(gpsLogFile, "GPS Log Created at " + logTime+"\n", () => console.log("GPS Log File Created " + gpsLogFile))


io.on('connect', socket => {
  console.log('Client connected to Socket.io');
  socket.emit("ping", "pong");
  logAndEmit("Drone not Connected", () => socket.emit("drone_connected", false))
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
      logAndEmit("Drone is ready to fly", () => socket.emit("flight_status", "Drone is ready to fly"));
      console.log(drone.navData);
    })

    // Send battery level
    drone.on("battery", (data) => logAndEmit("Battery Level: "+data, () => socket.emit("battery_level", data)))

    // Send landed
    drone.on("landed", () => logAndEmit("Landed", () => socket.emit("flight_status", "Drone is on the ground")))

    // Send hovering
    drone.on("hovering", () => socket.emit("flight_status", "Drone is hovering"))

    // Send landing
    drone.on("landing", () => logAndEmit("Landing", () => socket.emit("flight_status", "Drone is landing")))

    // Send flying
    drone.on("flying", () => socket.emit("flight_status", "Drone is flying"))

    // Send takingOff
    drone.on("takingOff", () => logAndEmit("Taking Off", () => socket.emit("flight_status", "Drone is taking off")))

    // Send emergency
    drone.on("emergency", () => logAndEmit("Emergency", () => socket.emit("flight_status", "Drone encountered an emergency condition")))

    drone.on("GPSFixStateChanged", (data) => logAndEmit("GPS Fix State "+JSON.stringify(data), () => socket.emit("flight_status", "GPS Fix State changed : " + JSON.stringify(data))))

    drone.on("MagnetoCalibrationRequiredState", (data) => logAndEmit("Calibration Required "+JSON.stringify(data), () => socket.emit("flight_status", "Calibration Required : " + JSON.stringify(data))))

    drone.on("MaxAltitudeChanged", (data) => socket.emit("flight_status", "Max Altitude changed : " + JSON.stringify(data)))

    drone.on("MaxDistanceChanged", (data) => socket.emit("flight_status", "Max Distance changed : " + JSON.stringify(data)))

    drone.on("OutdoorChanged", (data) => logAndEmit("Outdoor Changed "+JSON.stringify(data), () => socket.emit("flight_status", "Outdoor changed : " + JSON.stringify(data))))

    drone.on("HomeChanged", (data) => logAndEmit("Home Changed "+JSON.stringify(data), () => socket.emit("flight_status", "Home changed : " + JSON.stringify(data))))

    /* If number is different emit signal to the
      client with the new number of satellites found
    */
    let numOfSat = 0;

    drone.on("NumberOfSatelliteChanged", (data) => {
      log("Num of Satellites changed "+ data.numberOfSatellite, "logs/"+logTime.getTime()+".log");
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
      log(JSON.stringify(data), gpsLogFile)
      if(data.latitude != 500 && data.longitude != 500 && data.altitude != 500)
        socket.emit("gps_position_changed", data)
    })

    /* This is for testing purposes
    drone.takeOff()
    setTimeout(() => drone.land() , 7000)
    //*/

    drone.on("MavlinkPlayErrorStateChanged", function(data) {
      logAndEmit("Mavlink Play Error "+JSON.stringify(data), () => socket.emit("flight_status", "MavlinkPlayErrorStateChanged : " + JSON.stringify(data)))
    });

    drone.on("MavlinkFilePlayingStateChanged", function(data) {
      logAndEmit("Mavlink File Playing "+JSON.stringify(data), () => socket.emit("flight_status", "MavlinkFilePlayingStateChanged : " + JSON.stringify(data)))
    });

    var canDoMission = false
    drone.on("AvailabilityStateChanged", function(data) {
      console.log("AvailabilityStateChanged", data);
      logAndEmit("Mission Availability State Changed "+JSON.stringify(data), () => socket.emit("flight_status", "AvailabilityStateChanged : " + JSON.stringify(data)))
      if (data.AvailabilityState === 1) {
        canDoMission = true;
        socket.emit("drone_can_mission", true)
      }else{
        canDoMission = false;
        socket.emit("drone_can_mission", false)
      }
    });

    socket.on("start_mission" , function(data) {
      logAndEmit("Starting Mission "+JSON.stringify(data), () => 
      drone.Mavlink.start("/data/ftp/internal_000/flightplans/flightPlan.mavlink", 0))
    })

    drone.on("ComponentStateListChanged", function(data) {
      console.log("ComponentStateListChanged", data);
    });

    socket.on("cmd", (data) => {
      console.log(data)
      switch(data.type){
        case "take-off":
          drone.takeOff()
        break
        case "land":
          drone.land()
        break;
      }
    })

  })

  socket.on('disconnect', () => {
    console.log(jsoncolor({text: 'Client diconnected from Socket.io'}));
  })
});

function logAndEmit(text, callback) {
  log(text, logFile)
  callback()
}
