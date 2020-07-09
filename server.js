var bebop = require('node-bebop');

var drone = bebop.createClient();

console.log("Oi meu rei");

drone.connect(function() {
  drone.GPSSettings.resetHome();
  drone.WifiSettings.outdoorSetting(1);

  drone.on("PositionChanged", function(data) {
    console.log("Sai do lugar");
    console.log(data);
  });
});
