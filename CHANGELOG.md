# Changelog

## v2.3.0
- Avoids potential URL parsing issue and instead just does a simple check for the overlaydata protocol
- Reverts back to @mapbox/geojson-mapnikify 2.1.0

## v2.2.0
- Updated to @mapbox/geojson-mapnikify 3.0.0 (node 10 support)
- Updated to @mapbox/sphericalmercator 1.1.0 (support for floating point zoom levels in `ll` and `px` methods)

## v2.1.0
- Updated to @mapbox/geojson-mapnikify 2.1.0 (with improved error messaging)

## v2.0.0
- Updated to @mapbox/geojson-mapnikify 2.0.0
- Now accepting either mapnik 3.x or 4.x

## v1.1.0
- Updated version of node-mapnik to 4.0.1
- Ends node v0.10.x support

## v1.0.0

 - Updated to use mapnik 3.7.0
 - Updated geojson-mapnikify to 1.0.0
 - Dropped support for windows

## v0.8.0

 - Updated to use mapnik 3.6.0
 - Modified dependencies to use mapbox NPM namespace
