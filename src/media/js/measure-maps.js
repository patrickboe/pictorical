/** 
 * Patrick Boe, 2010:
 * The following formulas are adapted slightly for google's object model from Chris Veness' code under 
 * the following copyright, license details available at the included url:
 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2010            */
/*   - www.movable-type.co.uk/scripts/latlong.html                                                */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
//extend google's LatLng to include a distance/bearing methods
google.maps.LatLng.prototype.distanceTo=
/**
 * Returns the distance from this point to the supplied point, in meters 
 * (using Haversine formula)
 *
 * from: Haversine formula - R. W. Sinnott, "Virtues of the Haversine",
 *       Sky and Telescope, vol 68, no 2, 1984
 *
 * @param   {google.maps.LatLng} point: Latitude/longitude of destination point
 * @param   {Number} [precision=4]: no of significant digits to use for returned value
 * @returns {Number} Distance in meters between this point and destination point
 */
function(point, precision) {
  // default 4 sig fig reflects typical 0.3% accuracy of spherical model
  if (typeof precision === 'undefined') precision = 4;  
  
  var R = 6371;
  var lat1 = this.lat().toRad(), lon1 = this.lng().toRad();
  var lat2 = point.lat().toRad(), lon2 = point.lng().toRad();
  var dLat = lat2 - lat1;
  var dLon = lon2 - lon1;

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1) * Math.cos(lat2) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c * 1000;
  return d.toFixed(precision);
}

/**
 * Returns the (initial) bearing from this point to the supplied point, in degrees
 *   see http://williams.best.vwh.net/avform.htm#Crs
 *
 * @param   {LatLon} point: Latitude/longitude of destination point
 * @returns {Number} Initial bearing in degrees from North
 */
google.maps.LatLng.prototype.bearingTo = function(point) {
  var lat1 = this._lat.toRad(), lat2 = point._lat.toRad();
  var dLon = (point._lon-this._lon).toRad();

  var y = Math.sin(dLon) * Math.cos(lat2);
  var x = Math.cos(lat1)*Math.sin(lat2) -
          Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
  var brng = Math.atan2(y, x);
  
  return (brng.toDeg()+360) % 360;
}

/**
 * Returns the destination point from this point having travelled the given distance (in km) on the 
 * given initial bearing (bearing may vary before destination is reached)
 *
 *   see http://williams.best.vwh.net/avform.htm#LL
 *
 * @param   {Number} brng: Initial bearing in degrees
 * @param   {Number} dist: Distance in km
 * @returns {LatLon} Destination point
 */
google.maps.LatLng.prototype.destinationPoint = function(brng, dist) {
  dist = dist/this._radius;  // convert dist to angular distance in radians
  brng = brng.toRad();  // 
  var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();

  var lat2 = Math.asin( Math.sin(lat1)*Math.cos(dist) + 
                        Math.cos(lat1)*Math.sin(dist)*Math.cos(brng) );
  var lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(lat1), 
                               Math.cos(dist)-Math.sin(lat1)*Math.sin(lat2));
  lon2 = (lon2+3*Math.PI)%(2*Math.PI) - Math.PI;  // normalise to -180...+180

  if (isNaN(lat2) || isNaN(lon2)) return null;
  return new google.maps.LatLng(lat2.toDeg(), lon2.toDeg());
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

//extend Number object with methods for converting degrees/radians

/** Convert numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
	Number.prototype.toRad = function() {
	 return this * Math.PI / 180;
	}
}

/** Convert radians to numeric (signed) degrees */
if (typeof(Number.prototype.toDeg) === "undefined") {
	Number.prototype.toDeg = function() {
	 return this * 180 / Math.PI;
	}
}