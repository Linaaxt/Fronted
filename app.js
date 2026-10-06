// app.js (simplificado, pega en tu proyecto)
let map;
let markers = [];
let poly;
let directionsService;
let directionsRenderer;
let infoWindow;

const HARDCODED_TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsZzExMjIzMzQ0Iiwicm9sZXMiOiJST0xFX1VTRVIiLCJpYXQiOjE3NjIzMDEyNjYsImV4cCI6MTc2MzE2NTI2Nn0.K7Mgotew2ZwL73gbfnmwcj9EC7L_BIrMxFPaj4p8lK4OgQv1Zsq1WbDSrVTKzxgHl03fUGOdKSX5lKyIvSYXnw';
function getAuthHeader() {
  const local = localStorage.getItem('jwt_token');
  const token = local || HARDCODED_TOKEN;
  // Cabeceras adicionales Postman
  const headers = {
    'apikey': 'fa41e06f-5834-41d5-877c-f0bdc2a9e074',
    'login': 'lg11223344',
    'token': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsZzExMjIzMzQ0Iiwicm9sZXMiOiJST0xFX1VTRVIiLCJpYXQiOjE3NjIzMDEyNjYsImV4cCI6MTc2MzE2NTI2Nn0.K7Mgotew2ZwL73gbfnmwcj9EC7L_BIrMxFPaj4p8lK4OgQv1Zsq1WbDSrVTKzxgHl03fUGOdKSX5lKyIvSYXnw',
    'password': 'MiNuevaPass1234'
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

window.initMap = function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 4.438888, lng: -75.232222 },
    zoom: 13,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });
  infoWindow = new google.maps.InfoWindow();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: '#1A73E8',
      strokeWeight: 6,
      strokeOpacity: 0.9
    }
  });

  // Autocomplete (Places)
  const input = document.getElementById('place-search');
  if (input) {
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
      if (place.geometry.viewport) map.fitBounds(place.geometry.viewport);
      else map.setCenter(place.geometry.location), map.setZoom(15);
      // opcional: añadir marcador temporal con botón para "Agregar parada"
      new google.maps.Marker({
        map,
        position: place.geometry.location,
        title: place.formatted_address
      });
    });
  }

  // Botón cargar ruta
  const btn = document.getElementById('load-route');
  if (btn) btn.addEventListener('click', () => {
    const code = document.getElementById('route-code').value.trim();
    if (!code) return alert('Introduce código de ruta');
    loadRoute(code);
  });

  // Si quieres autoload de un código por defecto:
  // loadRoute('RUTA123');
};

async function loadRoute(codigoRuta) {
  // petición al backend protegido
  try {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, getAuthHeader());
  const res = await fetch(`http://localhost:9001/api/trayectos/${encodeURIComponent(codigoRuta)}`, { headers });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Error backend:', res.status, txt);
      // No mostrar ni renderizar nada si el backend falla
      return;
    }
  const data = await res.json();
  console.log('Respuesta backend:', data);
  // adaptarse si la respuesta esté anidada: data.trayectos o data
  const stops = data.trayectos || data;
  // ordenar por ordenParada por seguridad
  stops.sort((a,b) => (a.ordenParada ?? 0) - (b.ordenParada ?? 0));
  renderRoute(stops);
  } catch (err) {
    console.error('Fetch error', err);
    // No mostrar ni renderizar nada si el backend falla
  }
}

function clearMap() {
  markers.forEach(m => m.setMap(null));
  markers = [];
  if (poly) poly.setMap(null);
  poly = null;
  if (directionsRenderer) directionsRenderer.set('directions', null);
  document.getElementById('route-list').innerHTML = '';
}

function renderRoute(stops) {
  clearMap();
  if (!stops || stops.length === 0) {
    alert('No hay paradas para esta ruta');
    return;
  }
  const path = [];
  const waypoints = [];
  const routeList = document.getElementById('route-list');
  let conductorNombre = '';
  if (stops[0] && (stops[0].nombres || stops[0].apellidos)) {
    conductorNombre = `${stops[0].nombres || ''} ${stops[0].apellidos || ''}`.trim();
  }
  if (conductorNombre) {
    routeList.innerHTML = `<div style="font-size:1.1em;font-weight:500;margin-bottom:12px;color:#1A73E8;">Conductor: ${conductorNombre}</div>`;
  } else {
    routeList.innerHTML = '';
  }

  stops.forEach((stop, idx) => {
    const lat = Number(stop.latitud);
    const lng = Number(stop.longitud);
    const pos = isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
    if (pos) path.push(pos);

    // Inicial del conductor: solo la inicial del primer nombre (no del lugar)
    let inicial = '?';
    if (stop.nombres && typeof stop.nombres === 'string' && stop.nombres.trim().length > 0) {
      const partes = stop.nombres.trim().split(/\s+/);
      inicial = partes[0][0].toUpperCase();
    } else if (stop.apellidos && typeof stop.apellidos === 'string' && stop.apellidos.trim().length > 0) {
      const partes = stop.apellidos.trim().split(/\s+/);
      inicial = partes[0][0].toUpperCase();
    } else if (stop.loginRegistro && typeof stop.loginRegistro === 'string' && stop.loginRegistro.trim().length > 0) {
      inicial = stop.loginRegistro.trim()[0].toUpperCase();
    }

    // Icono: inicio y fin personalizados, intermedios el pin rojo clásico
    let icono = null;
    if (idx === 0) {
      // Inicio: icono especial (rojo con bandera)
      icono = {
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='20' cy='20' r='18' fill='#EA4335' stroke='white' stroke-width='2'/><text x='20' y='26' text-anchor='middle' font-size='20' font-family='Arial' fill='white'>🏁</text></svg>`)}`,
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
      };
    } else if (idx === stops.length - 1) {
      // Fin: icono especial (amarillo con bandera)
      icono = {
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='20' cy='20' r='18' fill='#F9AB00' stroke='white' stroke-width='2'/><text x='20' y='26' text-anchor='middle' font-size='20' font-family='Arial' fill='white'>🏁</text></svg>`)}`,
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
      };
    } else {
      // Intermedios: pin rojo clásico de Google Maps
      icono = {
        url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png',
        scaledSize: new google.maps.Size(27, 43),
        anchor: new google.maps.Point(13, 43)
      };
    }
    const marker = new google.maps.Marker({
      map: pos ? map : null,
      position: pos || map.getCenter(),
      icon: icono,
      title: stop.ubicacion || `Parada ${idx+1}`,
      animation: google.maps.Animation.DROP
    });
    marker.stopData = stop;

    // Mostrar nombre de la ubicación como InfoWindow abierto por defecto, sin la X de cierre
    if (pos && stop.ubicacion) {
      const info = new google.maps.InfoWindow({
        content: `
          <div style='position:relative;min-width:180px;'>
            <div style='font-weight:600;color:#1A73E8;font-size:1.05em;text-align:left;'>${stop.ubicacion}</div>
          </div>`
      });
      info.open(map, marker);
      marker.addListener('click', () => {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 700);
        infoWindow.setContent(`
          <div style='position:relative;min-width:180px;'>
            <div style='font-weight:600;color:#1A73E8;font-size:1.05em;text-align:left;'>${stop.ubicacion || 'Sin nombre'}</div>
            <div style='margin-top:6px;font-weight:400;color:#222;font-size:0.98em;'>
              Orden: ${stop.ordenParada}<br/>
              Lat/Lng: ${stop.latitud || 'N/A'}, ${stop.longitud || 'N/A'}<br/>
              Registro: ${stop.loginRegistro || ''}
            </div>
          </div>`);
        infoWindow.open(map, marker);
      });
    } else {
      marker.addListener('click', () => {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 700);
        infoWindow.setContent(`
          <div style='position:relative;min-width:180px;'>
            <div style='font-weight:600;color:#1A73E8;font-size:1.05em;text-align:left;padding-right:18px;'>${stop.ubicacion || 'Sin nombre'}</div>
            <div style='margin-top:6px;font-weight:400;color:#222;font-size:0.98em;'>
              Orden: ${stop.ordenParada}<br/>
              Lat/Lng: ${stop.latitud || 'N/A'}, ${stop.longitud || 'N/A'}<br/>
              Registro: ${stop.loginRegistro || ''}
            </div>
          </div>`);
        infoWindow.open(map, marker);
      });
    }
    markers.push(marker);

    // entrada lateral
    const entry = document.createElement('div');
    entry.className = 'side-entry';
    entry.innerHTML = `<b style='color:#1A73E8;font-weight:600;'>${idx+1}. ${stop.ubicacion || 'Sin ubicación'}</b><br/>${pos ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '<i>Sin coords</i>'}`;
    entry.addEventListener('click', () => {
      if (pos) map.panTo(pos), map.setZoom(15);
      google.maps.event.trigger(marker, 'click');
    });
    routeList.appendChild(entry);

    // Para Directions API: solo los intermedios van en waypoints
    if (idx > 0 && idx < stops.length - 1 && pos) {
      waypoints.push({ location: pos, stopover: true });
    }
  });

  // Usar DirectionsService para ruta realista
  if (path.length >= 2) {
    directionsService.route({
      origin: path[0],
      destination: path[path.length - 1],
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
      } else {
        // fallback: línea recta si Directions falla
        poly = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#1A73E8',
          strokeOpacity: 0.9,
          strokeWeight: 6,
          map
        });
      }
    });
    // ajustar bounds
    const bounds = new google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    map.fitBounds(bounds);
  } else if (markers[0]) {
    map.setCenter(markers[0].getPosition());
  }
}
