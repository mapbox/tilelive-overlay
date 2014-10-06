[![Build Status](https://travis-ci.org/mapbox/tilelive-overlay.svg?branch=master)](https://travis-ci.org/mapbox/tilelive-overlay)

# tilelive-overlay

Add GeoJSON features with simplestyle styles in a tilelive pipeline.

## Install

    npm install --save tilelive-overlay

## API

* `overlaydata://GEOJSONSTRING`
* `overlaydata://2x:GEOJSONSTRING` (retina)

Provides a `overlaydata://GEOJSONSTRING` scheme for [tilelive](https://www.npmjs.org/package/tilelive),
which transforms [GeoJSON](http://geojson.org/) into a [Mapnik](http://mapnik.org/) stylesheet
using [geojson-mapnikify](https://github.com/mapbox/geojson-mapnikify), and then provides
raster tiles of it.
