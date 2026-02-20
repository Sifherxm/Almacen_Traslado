<?php

function obtenerLotes() {

    $url = "https://traslado-almacen-default-rtdb.firebaseio.com/lotes.json";

    $response = file_get_contents($url);

    if ($response === FALSE) {
        return [];
    }

    return json_decode($response, true);
}

function obtenerRegistrosRFID() {

    $url = "https://traslado-almacen-default-rtdb.firebaseio.com/registros.json";

    $response = file_get_contents($url);

    if ($response === FALSE) {
        return [];
    }

    return json_decode($response, true);
}

function obtenerMovimientos() {

    $url = "https://traslado-almacen-default-rtdb.firebaseio.com/movimientos.json";

    $response = file_get_contents($url);

    if ($response === FALSE) {
        return [];
    }

    return json_decode($response, true);
}
?>
