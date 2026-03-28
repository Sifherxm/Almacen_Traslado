<?php
require_once __DIR__ . '/conex.php';

$registros = obtenerRegistrosRFID();
$total_registros = !empty($registros) ? count($registros) : 0;
?>

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>RFID - ObsidianCode</title>
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
                <li class="active">RFID</li>
            </ul>
        </nav>
    </aside>

    <!-- Main Content -->
    <main class="main">

        <!-- Header -->
        <header class="header">
            <h1>Módulo RFID</h1>
        </header>

        <!-- KPI Cards -->
        <section class="cards">
            <div class="card">
                <h3>Total Registros RFID</h3>
                <p><?php echo $total_registros; ?></p>
            </div>
        </section>

        <!-- Tabla -->
        <section class="table-section">
            <h2>Registros Detectados</h2>
            <table>
                <thead>
                    <tr>
                        <th>UID</th>
                        <th>FECHA</th>
                        <th>HORA</th>
                    </tr>
                </thead>
                <tbody>

                <?php
                if (!empty($registros)) {

                    foreach ($registros as $id => $registro) {

                        echo "<tr>";
                        echo "<td>" . ($registro['uid'] ?? $id) . "</td>";
                        echo "<td>" . ($registro['fecha'] ?? 'N/A') . "</td>";
                        echo "<td>" . ($registro['hora'] ?? 'N/A') . "</td>";
                        echo "</tr>";
                    }

                } else {
                    echo "<tr><td colspan='3'>No hay registros RFID</td></tr>";
                }
                ?>

                </tbody>
            </table>
        </section>

    </main>
</div>

</body>
</html>