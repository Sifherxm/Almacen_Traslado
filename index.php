<?php
require_once __DIR__ . '/conex.php';

$lotes = obtenerLotes();
$movimientos = obtenerMovimientos();

$total_lotes = !empty($lotes) ? count($lotes) : 0;

$entradas_hoy = 0;
$salidas_hoy = 0;

$hoy = date("Y-m-d");

if (!empty($movimientos)) {

    foreach ($movimientos as $mov) {

        if (isset($mov['fecha']) && $mov['fecha'] === $hoy) {

            if (isset($mov['tipo']) && $mov['tipo'] === "ENTRADA") {
                $entradas_hoy++;
            }

            if (isset($mov['tipo']) && $mov['tipo'] === "SALIDA") {
                $salidas_hoy++;
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <!--<meta http-equiv="refresh" content="70">-->
    <title>Dashboard - ObsidianCode</title>
    <link rel="stylesheet" href="styles.css">
</head>

<body>

    <div class="container">

        <!-- Sidebar -->
        <aside class="sidebar">
            <h2 class="logo">ObsidianCode</h2>
            <nav>
                <ul>
                    
                    <li onclick="window.location.href='index.php'">Dashboard</li>
                    <li onclick="window.location.href='movimientos.php'">Movimientos</li>
                    <li onclick="window.location.href='rfid.php'">RFID</li>
                </ul>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="main">

            <!-- Header -->
            <header class="header">
                <h1>Panel de Control</h1>
                <!--<div class="user-info">
                    <span>Usuario</span>
                </div>-->
            </header>

            <!-- KPI Cards dinámicas -->
            <section class="cards">
                <div class="card">
                    <h3>Total Lotes</h3>
                    <p><?php echo $total_lotes; ?></p>
                </div>

                <div class="card">
                    <h3>Entradas Hoy</h3>
                    <p><?php echo $entradas_hoy; ?></p>
                </div>

                <div class="card">
                    <h3>Salidas Hoy</h3>
                    <p><?php echo $salidas_hoy; ?></p>
                </div>
            </section>
            <!-- Tabla dinámica -->
            <section class="table-section">
                <h2>Últimos Lotes Registrados</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>CANTIDAD</th>
                            <th>LOTE</th>
                            <th>UBICACION</th>
                            <th>ULTIMO</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        if (!empty($lotes)) {

                            foreach ($lotes as $id => $lote) {

                                echo "<tr>";
                                echo "<td>" . $id . "</td>";
                                echo "<td>" . ($lote['cantidad'] ?? '') . "</td>";
                                echo "<td>" . ($lote['lote'] ?? '') . "</td>";
                                echo "<td>" . ($lote['ubicacion'] ?? '') . "</td>";
                                echo "<td>" . ($lote['ultimo_almacen'] ?? '') . "</td>";
                                echo "</tr>";
                            }

                        } else {
                            echo "<tr><td colspan='5'>No hay datos</td></tr>";
                        }
                        ?>

                    </tbody>

                </table>
            </section>

        </main>
    </div>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"></script>F

</body>

</html>